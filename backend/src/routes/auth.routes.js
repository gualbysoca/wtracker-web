// src/routes/auth.routes.js
const { Router }  = require('express');
const controller  = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = Router();

router.post('/login',   controller.login);
router.post('/mobile/login', controller.mobileLogin);
router.post('/refresh', controller.refresh);
router.post('/logout',  controller.logout);
router.get('/me',       authenticate, controller.getProfile);

module.exports = router;
