const settingService = require('../services/setting.service');
const { getEvidenceStorageUsage } = require('../services/evidenceRetention.service');
const { updateSettingsSchema } = require('../validations/setting.validation');
const { sendSuccess, sendError } = require('../utils/responseFormatter');

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
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Configuraciones inválidas', 400, parsed.error.flatten().fieldErrors);
    }
    const settings = await settingService.updateSettings(parsed.data);
    return sendSuccess(res, settings, 'Configuraciones actualizadas exitosamente');
  } catch (error) {
    return next(error);
  }
};

const getEvidenceStorage = async (req, res, next) => {
  try {
    const usage = await getEvidenceStorageUsage();
    return sendSuccess(res, usage, 'Uso de almacenamiento de evidencias');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getEvidenceStorage,
};
