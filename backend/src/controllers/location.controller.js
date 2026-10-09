// src/controllers/location.controller.js
const locationService = require('../services/location.service');
const { locationBatchSchema } = require('../validations/location.validation');
const { sendSuccess, sendError } = require('../utils/responseFormatter');

const mobileCreateLocations = async (req, res, next) => {
  try {
    const parsed = locationBatchSchema.safeParse(req.body);
    
    // Early Return Pattern
    if (!parsed.success) {
      return sendError(res, 'Datos de ubicación inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const userId = req.user.id; // Viene del JWT
    const savedCount = await locationService.saveLocationBatch(userId, parsed.data);

    return sendSuccess(res, { savedCount }, 'Ubicaciones guardadas exitosamente', 201);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  mobileCreateLocations,
};
