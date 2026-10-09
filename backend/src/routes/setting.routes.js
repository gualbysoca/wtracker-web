const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/', authenticate, settingController.getSettings);
router.put('/', authenticate, settingController.updateSettings);

module.exports = router;
