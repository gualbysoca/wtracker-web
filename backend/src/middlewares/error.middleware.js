// src/middlewares/error.middleware.js
// Manejador global de errores — nunca silencia un error

const { sendError } = require('../utils/responseFormatter');

/**
 * Middleware de manejo global de errores.
 * Debe ser el ÚLTIMO middleware registrado en Express.
 */
const globalErrorHandler = (err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    stack:   process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url:     req.originalUrl,
    method:  req.method,
  });

  // Errores de validación de Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, `Archivo demasiado grande. Máximo permitido: ${process.env.MAX_FILE_SIZE_MB || 10}MB`, 400);
  }

  // Errores de violación de unicidad en PostgreSQL
  if (err.code === '23505') {
    return sendError(res, 'Ya existe un registro con esos datos', 409);
  }

  // Errores de clave foránea en PostgreSQL
  if (err.code === '23503') {
    return sendError(res, 'Referencia a un registro que no existe', 400);
  }

  // Error conocido con status definido
  if (err.statusCode) {
    return sendError(res, err.message, err.statusCode);
  }

  // Error genérico desconocido
  return sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    500
  );
};

/**
 * Middleware para rutas no encontradas (404)
 */
const notFoundHandler = (req, res) => {
  return sendError(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404);
};

module.exports = { globalErrorHandler, notFoundHandler };
