// src/services/user.service.js
// Lógica de negocio para gestión de usuarios

const { query }       = require('../configs/database');
const { hashPassword } = require('./auth.service');
const eventBus = require('../utils/eventBus');

/**
 * Lista usuarios con filtros opcionales y paginación
 */
const listUsers = async ({ page = 1, limit = 20, search, role, include_inactive }) => {
  const offset = (page - 1) * limit;
  const conditions = ['is_deleted = FALSE'];
  const params = [];

  if (!include_inactive) {
    conditions.push('is_active = TRUE');
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM users WHERE ${whereClause}`,
    params
  );

  params.push(limit, offset);
  const usersResult = await query(
    `SELECT id, full_name, email, role, phone, is_active, avatar_url, created_at, updated_at
     FROM users
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    users: usersResult.rows,
    total: parseInt(countResult.rows[0].count),
  };
};

/**
 * Obtiene un usuario por ID (sin password_hash)
 */
const getUserById = async (id) => {
  const result = await query(
    `SELECT id, full_name, email, role, phone, is_active, avatar_url, created_at, updated_at
     FROM users WHERE id = $1 AND is_deleted = FALSE`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Crea un nuevo usuario
 */
const createUser = async ({ full_name, email, password, role, phone }) => {
  const password_hash = await hashPassword(password);

  const result = await query(
    `INSERT INTO users (full_name, email, password_hash, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, full_name, email, role, phone, is_active, created_at`,
    [full_name, email, password_hash, role, phone || null]
  );

  return result.rows[0];
};

/**
 * Actualiza datos de un usuario
 */
const updateUser = async (id, updateData) => {
  const fields = [];
  const params = [];

  const UPDATABLE_FIELDS = ['full_name', 'email', 'role', 'phone', 'is_active'];

  for (const field of UPDATABLE_FIELDS) {
    if (updateData[field] !== undefined) {
      params.push(updateData[field]);
      fields.push(`${field} = $${params.length}`);
    }
  }

  if (updateData.password) {
    const hash = await hashPassword(updateData.password);
    params.push(hash);
    fields.push(`password_hash = $${params.length}`);
  }

  if (fields.length === 0) return getUserById(id);

  params.push(id);
  const result = await query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${params.length}
     RETURNING id, full_name, email, role, phone, is_active, avatar_url, updated_at`,
    params
  );

  return result.rows[0] || null;
};

/**
 * Elimina lógicamente (desactiva) un usuario
 */
const deactivateUser = async (id) => {
  await query(`UPDATE users SET is_deleted = TRUE, is_active = FALSE WHERE id = $1`, [id]);
};

/**
 * Obtiene métricas de rendimiento de un usuario móvil
 */
const getUserPerformance = async (userId, dateFrom, dateTo) => {
  const fromDate = dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const toDate   = dateTo || new Date().toISOString();

  const statsRes = await query(
    `SELECT
       COUNT(*) FILTER (WHERE v.status = 'visitado') AS total_visited,
       COUNT(*) FILTER (WHERE v.status = 'fallido')  AS total_failed,
       COUNT(*) FILTER (WHERE v.status = 'en_ruta')  AS total_in_route,
       COUNT(*) AS total_visits,
       COUNT(DISTINCT DATE(v.created_at)) AS worked_days,
       ROUND(
         COUNT(*) FILTER (WHERE v.status = 'visitado')::numeric /
         NULLIF(COUNT(*) FILTER (WHERE v.status IN ('visitado', 'fallido')), 0) * 100,
         1
       ) AS success_rate,
       AVG(
         EXTRACT(EPOCH FROM (v.completed_at - v.started_at)) / 60
       )::int AS avg_visit_duration_minutes
     FROM visits v
     WHERE v.user_id = $1
       AND v.created_at BETWEEN $2 AND $3`,
    [userId, fromDate, toDate]
  );

  const visitsRes = await query(
    `SELECT id, created_at, visit_lat, visit_lng
     FROM visits
     WHERE user_id = $1
       AND created_at BETWEEN $2 AND $3
     ORDER BY created_at ASC`,
    [userId, fromDate, toDate]
  );

  const row = statsRes.rows[0];
  const workedDays = parseInt(row.worked_days || '0', 10);
  const totalVisited = parseInt(row.total_visited || '0', 10);
  const totalFailed  = parseInt(row.total_failed || '0', 10);
  const totalVisits  = parseInt(row.total_visits || '0', 10);

  // Group visits by day to calculate daily distance
  const visitsByDay = {};
  for (const v of visitsRes.rows) {
    const dayKey = new Date(v.created_at).toISOString().split('T')[0];
    if (!visitsByDay[dayKey]) visitsByDay[dayKey] = [];
    visitsByDay[dayKey].push(v);
  }

  let totalDistanceKm = 0;
  let totalDowntimeMins = 0;
  for (const dayKey in visitsByDay) {
    const dayVisits = visitsByDay[dayKey];
    for (let i = 1; i < dayVisits.length; i++) {
      const prev = dayVisits[i-1];
      const curr = dayVisits[i];
      if (prev.visit_lat && prev.visit_lng && curr.visit_lat && curr.visit_lng) {
        const R = 6371; // km
        const dLat = (curr.visit_lat - prev.visit_lat) * Math.PI / 180;
        const dLon = (curr.visit_lng - prev.visit_lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(prev.visit_lat * Math.PI / 180) * Math.cos(curr.visit_lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        totalDistanceKm += R * c;
      }

      const diffMs = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
      if (diffMs > 30 * 60000) {
        totalDowntimeMins += Math.floor((diffMs - (30 * 60000)) / 60000);
      }
    }
  }

  const avgVisitedPerDay = workedDays > 0 ? (totalVisited / workedDays).toFixed(1) : '0.0';
  const avgFailedPerDay  = workedDays > 0 ? (totalFailed / workedDays).toFixed(1) : '0.0';
  const avgTasksPerDay   = workedDays > 0 ? (totalVisits / workedDays).toFixed(1) : '0.0';
  const avgDistancePerDay = workedDays > 0 ? (totalDistanceKm / workedDays).toFixed(1) : '0.0';
  const avgDowntimeMinutes = workedDays > 0 ? Math.round(totalDowntimeMins / workedDays) : 0;

  return {
    ...row,
    worked_days: workedDays,
    avg_visited_per_day: parseFloat(avgVisitedPerDay),
    avg_failed_per_day: parseFloat(avgFailedPerDay),
    avg_tasks_per_day: parseFloat(avgTasksPerDay),
    avg_distance_per_day: parseFloat(avgDistancePerDay),
    avg_downtime_minutes: avgDowntimeMinutes,
  };
};

/**
 * Activa o desactiva la jornada (shift) de un usuario
 */
const toggleShift = async (userId, isOnShift) => {
  const result = await query(
    `UPDATE users SET is_on_shift = $1, updated_at = NOW() WHERE id = $2 RETURNING id, is_on_shift`,
    [isOnShift, userId]
  );
  eventBus.emit('map_update');
  return result.rows[0];
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  getUserPerformance,
  toggleShift,
};
