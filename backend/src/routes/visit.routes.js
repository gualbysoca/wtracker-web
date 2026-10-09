// src/routes/visit.routes.js  (backoffice)
const { Router }  = require('express');
const controller  = require('../controllers/visit.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'supervisor'));

router.get('/', controller.listVisits);

module.exports = router;
