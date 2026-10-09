// src/routes/client.routes.js
const { Router }  = require('express');
const controller  = require('../controllers/client.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/',     authorize('admin', 'supervisor'),               controller.listClients);
router.get('/:id',  authorize('admin', 'supervisor'),               controller.getClient);
router.post('/',    authorize('admin', 'supervisor'),               controller.createClient);
router.put('/:id',  authorize('admin', 'supervisor'),               controller.updateClient);
router.delete('/:id', authorize('admin', 'supervisor'),               controller.deleteClient);

module.exports = router;
