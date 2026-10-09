const settingService = require('../services/setting.service');
const { sendSuccess } = require('../utils/responseFormatter');

const getSettings = async (req, res, next) => {
  try {
    const settings = await settingService.getAllSettings();
    return sendSuccess(res, settings, 'Configuraciones recuperadas exitosamente');
  } catch (error) {
    return next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    const settings = await settingService.updateSettings(req.body);
    return sendSuccess(res, settings, 'Configuraciones actualizadas exitosamente');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
