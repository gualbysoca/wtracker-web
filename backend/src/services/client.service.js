// src/services/client.service.js
// Lógica de negocio para el directorio master de clientes

const { query } = require('../configs/database');

const listClients = async ({ page = 1, limit = 20, search }) => {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = ['is_active = TRUE'];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(business_name ILIKE $${params.length} OR address ILIKE $${params.length} OR contact_name ILIKE $${params.length})`);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM clients WHERE ${whereClause}`, params
  );

  params.push(limit, offset);
  const result = await query(
    `SELECT
       id, business_name, contact_name, phone, email,
       address, city, lat, lng, geofence_radius, notes, is_active, created_at
     FROM clients
     WHERE ${whereClause}
     ORDER BY business_name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { clients: result.rows, total: parseInt(countResult.rows[0].count) };
};

/**
 * Obtiene todos los clientes activos con su historial resumido (para la app móvil)
 */
const listClientsForMobile = async () => {
  const result = await query(
    `SELECT
       c.id, c.business_name, c.contact_name, c.phone,
       c.address, c.lat, c.lng, c.geofence_radius,
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
  );

  return result.rows;
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

  return result.rows[0] || null;
};

const createClient = async (data) => {
  const { business_name, contact_name, phone, email, address, city, lat, lng, geofence_radius, notes } = data;

  // lat/lng se pasan como strings para evitar la ambigüedad de tipos que PostgreSQL
  // genera cuando el mismo parámetro aparece en una columna numeric Y en ST_MakePoint(float8)
  const result = await query(
    `INSERT INTO clients
       (business_name, contact_name, phone, email, address, city,
        lat, lng, location, geofence_radius, notes)
     VALUES
       ($1, $2, $3, $4, $5, $6,
        ($7::text)::numeric, ($8::text)::numeric,
        ST_MakePoint(($8::text)::float8, ($7::text)::float8)::geography,
        $9, $10)
     RETURNING id, business_name, contact_name, phone, email, address, city, lat, lng, geofence_radius, created_at`,
    [business_name, contact_name || null, phone || null, email || null,
     address || null, city || null,
     String(lat), String(lng),
     geofence_radius || 100, notes || null]
  );

  return result.rows[0];
};

const updateClient = async (id, data) => {
  const fields = [];
  const params = [];

  const UPDATABLE = ['business_name', 'contact_name', 'phone', 'email', 'address', 'city', 'geofence_radius', 'notes', 'is_active'];

  for (const field of UPDATABLE) {
    if (data[field] !== undefined) {
      params.push(data[field]);
      fields.push(`${field} = $${params.length}`);
    }
  }

  if (data.lat !== undefined && data.lng !== undefined) {
    params.push(String(data.lat), String(data.lng));
    fields.push(`lat = ($${params.length - 1}::text)::numeric`);
    fields.push(`lng = ($${params.length}::text)::numeric`);
    fields.push(`location = ST_MakePoint(($${params.length}::text)::float8, ($${params.length - 1}::text)::float8)::geography`);
  }

  if (fields.length === 0) return getClientById(id);

  params.push(id);
  const result = await query(
    `UPDATE clients SET ${fields.join(', ')} WHERE id = $${params.length}
     RETURNING id, business_name, contact_name, phone, email, address, city, lat, lng, geofence_radius, notes, is_active, created_at, updated_at`,
    params
  );

  return result.rows[0] || null;
};

const deleteClient = async (id) => {
  await query(`UPDATE clients SET is_active = FALSE WHERE id = $1`, [id]);
};

module.exports = {
  listClients,
  listClientsForMobile,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
