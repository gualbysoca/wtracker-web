// src/routes/dashboard.routes.js
const { Router }  = require('express');
const controller  = require('../controllers/visit.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'supervisor'));

router.get('/stats',     controller.getDashboardStats);
router.get('/map',       controller.getLiveMapData);
router.get('/map/stream', controller.streamLiveMapData);
router.get('/cross-data', controller.getCrossData);

module.exports = router;
