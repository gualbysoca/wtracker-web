// src/utils/responseFormatter.js
// Formateador de respuestas HTTP — mantiene un contrato uniforme en toda la API

/**
 * Respuesta exitosa estándar
 * @param {object} res - Express response object
 * @param {*} data - Datos a retornar
 * @param {string} message - Mensaje descriptivo
 * @param {number} statusCode - HTTP status (default 200)
 */
const sendSuccess = (res, data = null, message = 'OK', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Respuesta de error estándar
 * @param {object} res - Express response object
 * @param {string} message - Mensaje de error legible
 * @param {number} statusCode - HTTP status (default 400)
 * @param {object|null} errors - Errores de validación detallados
 */
const sendError = (res, message = 'Error', statusCode = 400, errors = null) => {
  const payload = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

/**
 * Respuesta paginada estándar
 */
const sendPaginated = (res, data, total, page, limit, message = 'OK') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page:        parseInt(page),
      limit:       parseInt(limit),
      totalPages:  Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
