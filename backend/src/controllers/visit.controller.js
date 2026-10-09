// src/controllers/visit.controller.js

const visitService = require('../services/visit.service');
const { createVisitSchema, visitQuerySchema } = require('../validations/visit.validation');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseFormatter');
const eventBus = require('../utils/eventBus');

const listVisits = async (req, res, next) => {
  try {
    const parsed = visitQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 'Parámetros inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const { visits, total } = await visitService.listVisits(parsed.data);
    return sendPaginated(res, visits, total, parsed.data.page, parsed.data.limit);
  } catch (error) {
    return next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await visitService.getDashboardStats();
    return sendSuccess(res, stats, 'Estadísticas del dashboard');
  } catch (error) {
    return next(error);
  }
};

const getLiveMapData = async (req, res, next) => {
  try {
    const liveData = await visitService.getLiveMapData();
    return sendSuccess(res, liveData, 'Datos del mapa en tiempo real');
  } catch (error) {
    return next(error);
  }
};

const streamLiveMapData = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Prevents Nginx from buffering the SSE stream
  res.flushHeaders();

  const sendUpdate = async () => {
    try {
      const liveData = await visitService.getLiveMapData();
      res.write(`data: ${JSON.stringify(liveData)}\n\n`);
    } catch (error) {
      console.error('SSE Error:', error);
    }
  };

  sendUpdate();

  const onUpdate = () => {
    sendUpdate();
  };

  eventBus.on('map_update', onUpdate);

  req.on('close', () => {
    eventBus.off('map_update', onUpdate);
  });
};

const getCrossData = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    const data = await visitService.getCrossData(date_from, date_to);
    return sendSuccess(res, data, 'Datos de cruce obtenidos');
  } catch (error) {
    return next(error);
  }
};

// ──────────── Mobile Endpoints ────────────

const mobileCreateVisit = async (req, res, next) => {
  try {
    const parsed = createVisitSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Datos de visita inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const visit = await visitService.createVisit({
      ...parsed.data,
      user_id: req.user.id, // viene del JWT
    });

    return sendSuccess(res, visit, 'Visita registrada exitosamente', 201);
  } catch (error) {
    return next(error);
  }
};

const mobileUploadEvidence = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'Se requiere un archivo de evidencia', 400);
    }

    const { lat, lng, captured_at, type } = req.body;
    const visitId = req.params.id;

    const { query } = require('../configs/database');

    const result = await query(
      `INSERT INTO evidence (visit_id, type, file_url, file_name, file_size, mime_type, lat, lng, captured_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, visit_id, type, file_url, lat, lng, captured_at, created_at`,
      [
        visitId,
        type || 'foto',
        `/uploads/${req.file.filename}`,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        lat || null,
        lng || null,
        captured_at ? new Date(captured_at) : new Date(),
      ]
    );

    return sendSuccess(res, result.rows[0], 'Evidencia subida exitosamente', 201);
  } catch (error) {
    return next(error);
  }
};

const mobileSyncData = async (req, res, next) => {
  try {
    // Retorna la última marca de tiempo de sincronización del servidor
    const { query } = require('../configs/database');
    const [clients, visits] = await Promise.all([
      query(`SELECT id, business_name, lat, lng, geofence_radius, updated_at
             FROM clients WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 500`),
      query(`SELECT id, client_id, status, updated_at
             FROM visits WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100`, [req.user.id]),
    ]);

    return sendSuccess(res, {
      clients:    clients.rows,
      my_visits:  visits.rows,
      server_time: new Date().toISOString(),
    }, 'Sincronización completada');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listVisits,
  getDashboardStats,
  getLiveMapData,
  streamLiveMapData,
  getCrossData,
  mobileCreateVisit,
  mobileUploadEvidence,
  mobileSyncData,
};
