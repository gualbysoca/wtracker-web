// src/services/client.service.js
// Lógica de negocio para el directorio master de clientes

const { query } = require('../configs/database');
const { createClientSchema, updateClientSchema } = require('../validations/client.validation');
const { getGeofenceRadiusMeters } = require('./setting.service');
const { tokenizeSearchQuery, escapeSqlLike, buildUnaccentExpression } = require('../utils/textSearch.util');
const { toMobileClientDTO, formatClientRecord } = require('../models/client.model');

const SEARCHABLE_CLIENT_COLUMNS = [
  'business_name',
  'contact_name',
  'address',
  'delivery_address',
  'stall_number',
  'client_code',
  "'cod ' || client_code",
  "'codigo ' || client_code",
];

const listClients = async ({ page = 1, limit = 20, search }) => {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = ['is_active = TRUE'];

  const searchTokens = tokenizeSearchQuery(search);
  if (searchTokens.length > 0) {
    const targetExpr = `CONCAT_WS(' ', ${SEARCHABLE_CLIENT_COLUMNS.join(', ')})`;
    const normalizedExpr = buildUnaccentExpression(targetExpr);

    searchTokens.forEach((token) => {
      params.push(`%${escapeSqlLike(token)}%`);
      conditions.push(`${normalizedExpr} LIKE $${params.length}`);
    });
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM clients WHERE ${whereClause}`,
    params
  );

  const queryParams = [...params, limit, offset];
  const result = await query(
    `SELECT
       id, business_name, contact_name, phone, email,
       address, delivery_address, stall_number, client_code, city,
       lat, lng, notes, is_active, created_at
     FROM clients
     WHERE ${whereClause}
     ORDER BY business_name ASC
     LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
    queryParams
  );

  const total = countResult.rows?.[0]?.count ? parseInt(countResult.rows[0].count, 10) : 0;
  return { clients: result.rows.map(formatClientRecord), total };
};

/**
 * Obtiene todos los clientes activos con su historial resumido (para la app móvil).
 * `geofence_radius` se mantiene en la respuesta por compatibilidad con versiones previas de la app,
 * pero ahora siempre es el radio global de Configuraciones (ya no existe por cliente).
 */
const listClientsForMobile = async () => {
  const [result, geofenceRadius] = await Promise.all([
    query(
      `SELECT
         c.id, c.business_name, c.contact_name, c.phone,
         c.address, c.delivery_address, c.stall_number, c.client_code,
         c.lat, c.lng,
         -- Último estado de visita
         (SELECT v.status
          FROM visits v
          WHERE v.client_id = c.id
          ORDER BY v.created_at DESC LIMIT 1) AS last_visit_status,
         (SELECT v.created_at
          FROM visits v
          WHERE v.client_id = c.id
          ORDER BY v.created_at DESC LIMIT 1) AS last_visit_at
       FROM clients c
       WHERE c.is_active = TRUE
       ORDER BY c.business_name ASC`
    ),
    getGeofenceRadiusMeters(),
  ]);

  return result.rows.map((row) => toMobileClientDTO(row, geofenceRadius));
};

const getClientById = async (id) => {
  const result = await query(
    `SELECT
       c.*,
       COUNT(v.id) FILTER (WHERE v.status = 'visitado') AS total_visits_success,
       COUNT(v.id) FILTER (WHERE v.status = 'fallido')  AS total_visits_failed,
       COUNT(v.id) AS total_visits
     FROM clients c
     LEFT JOIN visits v ON c.id = v.client_id
     WHERE c.id = $1
     GROUP BY c.id`,
    [id]
  );

  return formatClientRecord(result.rows[0]);
};

const createClient = async (data) => {
  const {
    business_name,
    contact_name,
    phone,
    email,
    address,
    delivery_address,
    stall_number,
    nro_puesto,
    client_code,
    city,
    lat,
    lng,
    notes,
  } = data;

  const resolvedStallNumber = stall_number !== undefined ? stall_number : (nro_puesto || null);

  // lat/lng se pasan como strings para evitar la ambigüedad de tipos que PostgreSQL
  // genera cuando el mismo parámetro aparece en una columna numeric Y en ST_MakePoint(float8)
  const result = await query(
    `INSERT INTO clients
       (business_name, contact_name, phone, email, address, delivery_address, stall_number, client_code, city,
        lat, lng, location, notes)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, $9,
        ($10::text)::numeric, ($11::text)::numeric,
        ST_MakePoint(($11::text)::float8, ($10::text)::float8)::geography,
        $12)
     RETURNING id, business_name, contact_name, phone, email, address, delivery_address, stall_number, client_code, city, lat, lng, created_at`,
    [
      business_name,
      contact_name || null,
      phone || null,
      email || null,
      address || null,
      delivery_address || null,
      resolvedStallNumber,
      client_code || null,
      city || null,
      String(lat),
      String(lng),
      notes || null,
    ]
  );

  return formatClientRecord(result.rows[0]);
};

const updateClient = async (id, data) => {
  const fields = [];
  const params = [];

  const resolvedData = { ...data };
  if (resolvedData.nro_puesto !== undefined && resolvedData.stall_number === undefined) {
    resolvedData.stall_number = resolvedData.nro_puesto;
  }
  delete resolvedData.nro_puesto;
  if (resolvedData.mercado !== undefined && resolvedData.business_name === undefined) {
    resolvedData.business_name = resolvedData.mercado;
  }
  delete resolvedData.mercado;

  const UPDATABLE = [
    'business_name',
    'contact_name',
    'phone',
    'email',
    'address',
    'delivery_address',
    'stall_number',
    'client_code',
    'city',
    'notes',
    'is_active',
  ];

  for (const field of UPDATABLE) {
    if (resolvedData[field] !== undefined) {
      params.push(resolvedData[field]);
      fields.push(`${field} = $${params.length}`);
    }
  }

  let latToUpdate = resolvedData.lat;
  let lngToUpdate = resolvedData.lng;

  if (latToUpdate !== undefined || lngToUpdate !== undefined) {
    if (latToUpdate === null || lngToUpdate === null) {
      fields.push(`lat = NULL`);
      fields.push(`lng = NULL`);
      fields.push(`location = NULL`);
    } else {
      if (latToUpdate === undefined || lngToUpdate === undefined) {
        const existing = await query(`SELECT lat, lng FROM clients WHERE id = $1`, [id]);
        if (existing.rows[0]) {
          if (latToUpdate === undefined) latToUpdate = existing.rows[0].lat;
          if (lngToUpdate === undefined) lngToUpdate = existing.rows[0].lng;
        }
      }
      if (latToUpdate !== undefined && lngToUpdate !== undefined && latToUpdate !== null && lngToUpdate !== null) {
        params.push(String(latToUpdate), String(lngToUpdate));
        fields.push(`lat = ($${params.length - 1}::text)::numeric`);
        fields.push(`lng = ($${params.length}::text)::numeric`);
        fields.push(`location = ST_MakePoint(($${params.length}::text)::float8, ($${params.length - 1}::text)::float8)::geography`);
      }
    }
  }

  if (fields.length === 0) return getClientById(id);

  fields.push('updated_at = NOW()');

  params.push(id);
  const result = await query(
    `UPDATE clients SET ${fields.join(', ')} WHERE id = $${params.length}
     RETURNING id, business_name, contact_name, phone, email, address, delivery_address, stall_number, client_code, city, lat, lng, notes, is_active, created_at, updated_at`,
    params
  );

  return formatClientRecord(result.rows[0]);
};

const deleteClient = async (id) => {
  await query(`UPDATE clients SET is_active = FALSE WHERE id = $1`, [id]);
};

const formatValidationIssues = (issues) =>
  issues.map((issue) => `${issue.path.join('.') || 'fila'}: ${issue.message}`).join('; ');

const applyBulkRow = async ({ action, id, data = {} }) => {
  if (action === 'create') {
    const parsed = createClientSchema.safeParse(data);
    if (!parsed.success) throw new Error(formatValidationIssues(parsed.error.issues));
    await createClient(parsed.data);
    return;
  }

  if (!id) throw new Error('Se requiere el id del cliente');
  const existing = await getClientById(id);
  if (!existing) throw new Error('Cliente no encontrado');

  if (action === 'delete') {
    await deleteClient(id);
    return;
  }

  const parsed = updateClientSchema.safeParse(data);
  if (!parsed.success) throw new Error(formatValidationIssues(parsed.error.issues));
  await updateClient(id, parsed.data);
};

/**
 * Procesa filas de un CSV. Cada fila es independiente: un error no revierte las demás,
 * y se devuelve el detalle por fila para que el usuario corrija solo las fallidas.
 */
const bulkProcessClients = async (rows) => {
  const summary = { created: 0, updated: 0, deleted: 0, errors: [] };
  const counterByAction = { create: 'created', update: 'updated', delete: 'deleted' };

  for (const row of rows) {
    try {
      await applyBulkRow(row);
      summary[counterByAction[row.action]] += 1;
    } catch (error) {
      summary.errors.push({ line: row.line, message: error.message });
    }
  }

  return summary;
};

module.exports = {
  listClients,
  listClientsForMobile,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  bulkProcessClients,
};
