// src/services/visit.service.js
// Lógica de negocio para visitas y monitoreo

const { query } = require('../configs/database');
const eventBus = require('../utils/eventBus');

/**
 * Registra o actualiza una visita desde la app móvil
 */
const createVisit = async ({ user_id, client_id, status, lat, lng, notes, timestamp }) => {
  // Calcular distancia al cliente usando PostGIS
  const clientResult = await query(
    `SELECT lat, lng FROM clients WHERE id = $1 AND is_active = TRUE`,
    [client_id]
  );

  if (clientResult.rowCount === 0) {
    const err = new Error('Cliente no encontrado');
    err.statusCode = 404;
    throw err;
  }

  const client = clientResult.rows[0];

  // Verificar que el usuario sea móvil y activo
  const userResult = await query(
    `SELECT role, is_active FROM users WHERE id = $1`,
    [user_id]
  );

  if (userResult.rowCount === 0) {
    const err = new Error('Usuario no encontrado');
    err.statusCode = 404;
    throw err;
  }

  const user = userResult.rows[0];
  if (!user.is_active || !['reponedor', 'vendedor', 'cobrador', 'repartidor'].includes(user.role)) {
    const err = new Error('Solo los usuarios móviles activos pueden ejecutar tareas.');
    err.statusCode = 403;
    throw err;
  }

  // Calcular distancia en metros usando la fórmula de Haversine aproximada
  const distanceResult = await query(
    `SELECT ROUND(
       ST_Distance(
         ST_SetSRID(ST_MakePoint($1::numeric, $2::numeric), 4326)::geography,
         ST_SetSRID(ST_MakePoint($3::numeric, $4::numeric), 4326)::geography
       )
     ) AS distance_meters`,
    [lng, lat, client.lng, client.lat]
  );

  const distanceMeters = distanceResult.rows[0]?.distance_meters || null;
  const visitTimestamp = timestamp ? new Date(timestamp) : new Date();

  // Buscar visita 'en_ruta' existente del mismo día para este usuario y cliente
  const existingVisitResult = await query(
    `SELECT id, status FROM visits 
     WHERE user_id = $1::uuid AND client_id = $2::uuid AND DATE(created_at) = CURRENT_DATE
     ORDER BY created_at DESC LIMIT 1`,
    [user_id, client_id]
  );

  const existingVisit = existingVisitResult.rows[0];

  if (existingVisit && existingVisit.status === 'en_ruta' && ['visitado', 'fallido'].includes(status)) {
    // Es una transición válida de 'en_ruta' a un estado final, actualizamos
    const result = await query(
      `UPDATE visits 
       SET status = $1::visit_status, visit_lat = $2::numeric, visit_lng = $3::numeric,
           visit_location = ST_SetSRID(ST_MakePoint($3::numeric, $2::numeric), 4326)::geography,
           distance_to_client = $4::integer, notes = COALESCE($5::text, notes), completed_at = $6::timestamptz
       WHERE id = $7::uuid
       RETURNING *`,
      [status, lat, lng, distanceMeters, notes || null, visitTimestamp, existingVisit.id]
    );
    eventBus.emit('map_update');
    return result.rows[0];
  }

  // Si no hay transición, creamos una nueva visita
  const startedAt = status === 'en_ruta' ? visitTimestamp : null;
  const completedAt = ['visitado', 'fallido'].includes(status) ? visitTimestamp : null;

  const result = await query(
    `INSERT INTO visits
       (user_id, client_id, status, visit_lat, visit_lng,
        visit_location, distance_to_client, notes, started_at, completed_at)
     VALUES
       ($1::uuid, $2::uuid, $3::visit_status, $4::numeric, $5::numeric,
        ST_SetSRID(ST_MakePoint($5::numeric, $4::numeric), 4326)::geography, $6::integer, $7::text, $8::timestamptz, $9::timestamptz)
     RETURNING *`,
    [user_id, client_id, status, lat, lng, distanceMeters, notes || null, startedAt, completedAt]
  );

  eventBus.emit('map_update');
  return result.rows[0];
};

/**
 * Lista visitas con filtros, join de usuario y cliente
 */
const listVisits = async ({ page = 1, limit = 20, search, user_id, client_id, status, date_from, date_to }) => {
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(c.business_name ILIKE $${params.length} OR c.contact_name ILIKE $${params.length})`);
  }
  if (user_id) {
    params.push(user_id);
    conditions.push(`v.user_id = $${params.length}`);
  }
  if (client_id) {
    params.push(client_id);
    conditions.push(`v.client_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`v.status = $${params.length}`);
  }
  if (date_from) {
    params.push(date_from);
    conditions.push(`v.created_at >= $${params.length}`);
  }
  if (date_to) {
    params.push(date_to);
    conditions.push(`v.created_at <= $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM visits v
     INNER JOIN users u ON v.user_id = u.id
     INNER JOIN clients c ON v.client_id = c.id
     WHERE ${whereClause}`, params
  );

  params.push(limit, offset);
  const visitsResult = await query(
    `SELECT
       v.id, v.status, v.visit_lat, v.visit_lng, v.distance_to_client,
       v.notes, v.started_at, v.completed_at, v.created_at,
       u.id AS user_id, u.full_name AS user_name, u.email AS user_email, u.role AS user_role,
       c.id AS client_id, c.business_name AS client_name, c.contact_name AS client_contact, c.address AS client_address, c.lat AS client_lat, c.lng AS client_lng, c.geofence_radius AS client_geofence_radius,
       COALESCE((
         SELECT json_agg(json_build_object('id', e.id, 'file_url', e.file_url, 'type', e.type, 'lat', e.lat, 'lng', e.lng, 'captured_at', e.captured_at))
         FROM evidence e WHERE e.visit_id = v.id
       ), '[]'::json) AS evidences
     FROM visits v
     INNER JOIN users u ON v.user_id = u.id
     INNER JOIN clients c ON v.client_id = c.id
     WHERE ${whereClause}
     ORDER BY v.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    visits: visitsResult.rows,
    total:  parseInt(countResult.rows[0].count),
  };
};

/**
 * Datos del dashboard: KPIs globales del día actual
 */
const getDashboardStats = async () => {
  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM visits WHERE DATE(created_at AT TIME ZONE 'America/La_Paz') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')) AS visits_today,
       (SELECT COUNT(*) FROM visits WHERE status = 'visitado' AND DATE(created_at AT TIME ZONE 'America/La_Paz') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')) AS visited_today,
       (SELECT COUNT(*) FROM visits WHERE status = 'fallido' AND DATE(created_at AT TIME ZONE 'America/La_Paz') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')) AS failed_today,
       (SELECT COUNT(*) FROM visits WHERE status = 'en_ruta' AND DATE(created_at AT TIME ZONE 'America/La_Paz') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')) AS currently_in_route,
       (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND is_on_shift = TRUE) AS active_users_today`
  );

  return result.rows[0];
};

/**
 * Datos de ubicación en tiempo real: último estado de cada usuario activo
 */
const getLiveMapData = async () => {
  const result = await query(
    `SELECT
       u.id AS user_id,
       COALESCE(ul.lat, v.visit_lat) AS lat,
       COALESCE(ul.lng, v.visit_lng) AS lng,
       CASE
         WHEN v.status = 'en_ruta' THEN 'en_ruta'
         ELSE 'Libre'
       END AS status,
       COALESCE(ul.captured_at, v.created_at) AS last_activity,
       u.full_name,
       u.role,
       CASE
         WHEN v.status = 'en_ruta' THEN c.business_name
         ELSE 'Sin tarea actual'
       END AS client_name,
       CASE WHEN v.status = 'en_ruta' THEN c.lat ELSE NULL END AS client_lat,
       CASE WHEN v.status = 'en_ruta' THEN c.lng ELSE NULL END AS client_lng
     FROM users u
     LEFT JOIN (
       SELECT DISTINCT ON (user_id) user_id, lat, lng, captured_at
       FROM user_locations
       WHERE captured_at >= NOW() - INTERVAL '24 hours'
       ORDER BY user_id, captured_at DESC
     ) ul ON ul.user_id = u.id
     LEFT JOIN (
       SELECT DISTINCT ON (user_id) user_id, visit_lat, visit_lng, status, created_at, client_id
       FROM visits
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       ORDER BY user_id, created_at DESC
     ) v ON v.user_id = u.id
     LEFT JOIN clients c ON v.client_id = c.id
     WHERE u.is_active = TRUE
       AND u.is_on_shift = TRUE
       AND u.role IN ('reponedor', 'vendedor', 'cobrador', 'repartidor')`
  );

  return result.rows;
};

/**
 * Matriz de cruce: vendedores vs reponedores por cliente
 */
const getCrossData = async (dateFrom, dateTo) => {
  const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const toDate   = dateTo || new Date().toISOString();

  const result = await query(
    `SELECT
       c.id AS client_id,
       c.business_name AS client_name,
       c.address,
       -- Vendedores que visitaron este cliente
       ARRAY_AGG(DISTINCT u_v.full_name) FILTER (WHERE u_v.role = 'vendedor' AND v.status = 'visitado') AS sellers,
       -- Reponedores que visitaron este cliente
       ARRAY_AGG(DISTINCT u_r.full_name) FILTER (WHERE u_r.role = 'reponedor' AND v.status = 'visitado') AS replenishers,
       COUNT(*) FILTER (WHERE v.status = 'visitado') AS total_visits,
       COUNT(*) FILTER (WHERE v.status = 'fallido')  AS total_failed
     FROM clients c
     LEFT JOIN visits v ON c.id = v.client_id AND v.created_at BETWEEN $1 AND $2
     LEFT JOIN users u_v ON v.user_id = u_v.id AND u_v.role = 'vendedor'
     LEFT JOIN users u_r ON v.user_id = u_r.id AND u_r.role = 'reponedor'
     WHERE c.is_active = TRUE
     GROUP BY c.id, c.business_name, c.address
     ORDER BY total_visits DESC`,
    [fromDate, toDate]
  );

  return result.rows;
};

module.exports = {
  createVisit,
  listVisits,
  getDashboardStats,
  getLiveMapData,
  getCrossData,
};
