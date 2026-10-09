// src/routes/mobile.routes.js
// Rutas específicas para consumo desde la app Android
// Requieren autenticación pero cualquier rol de campo puede acceder

const { Router }  = require('express');
const clientController = require('../controllers/client.controller');
const visitController  = require('../controllers/visit.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { uploadEvidence } = require('../configs/multer');
const { listClientsForMobile } = require('../services/client.service');
const { sendSuccess } = require('../utils/responseFormatter');
const locationController = require('../controllers/location.controller');
const userController = require('../controllers/user.controller');

const router = Router();

// Todos los endpoints móviles requieren autenticación
router.use(authenticate);

// GET /api/v1/mobile/clients — Lista de clientes optimizada para la app
router.get('/clients', async (req, res, next) => {
  try {
    const clients = await listClientsForMobile();
    return sendSuccess(res, clients, 'Clientes descargados');
  } catch (error) {
    return next(error);
  }
});

// POST /api/v1/mobile/visits — Reporte de visita desde la app
router.post('/visits', visitController.mobileCreateVisit);

// POST /api/v1/mobile/locations — Tracking GPS en lote
router.post('/locations', locationController.mobileCreateLocations);

// POST /api/v1/mobile/visits/:id/evidence — Subida de evidencia
router.post(
  '/visits/:id/evidence',
  uploadEvidence.single('file'),
  visitController.mobileUploadEvidence
);

// GET /api/v1/mobile/sync — Sincronización periódica
router.get('/sync', visitController.mobileSyncData);

// POST /api/v1/mobile/shift — Iniciar o finalizar jornada
router.post('/shift', userController.toggleShift);

module.exports = router;
