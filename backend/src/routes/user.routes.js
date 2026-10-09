// src/routes/user.routes.js
const { Router }  = require('express');
const controller  = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authenticate);

router.get('/',                        authorize('admin', 'supervisor'), controller.listUsers);
router.get('/:id',                     authorize('admin', 'supervisor'), controller.getUser);
router.get('/:id/performance',         authorize('admin', 'supervisor'), controller.getUserPerformance);
router.post('/',                       authorize('admin', 'supervisor'),               controller.createUser);
router.put('/:id',                     authorize('admin', 'supervisor'),               controller.updateUser);
router.delete('/:id',                  authorize('admin', 'supervisor'),               controller.deactivateUser);

module.exports = router;
