// src/middlewares/auth.middleware.js
// Middleware de autenticación JWT — protege rutas privadas

const { verifyAccessToken } = require('../configs/jwt');
const { sendError }          = require('../utils/responseFormatter');

/**
 * Middleware de autenticación.
 * Extrae y valida el Bearer token del header Authorization.
 * Si es válido, inyecta req.user con el payload decodificado.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return sendError(res, 'Token de acceso requerido', 401);
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { id, email, role, iat, exp }
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expirado. Por favor inicia sesión nuevamente.', 401);
    }
    return sendError(res, 'Token inválido', 401);
  }
};

/**
 * Factory de middleware de autorización por rol.
 * Uso: authorize('admin', 'supervisor')
 * @param {...string} allowedRoles - Roles con acceso permitido
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'No autenticado', 401);
  }
  if (!allowedRoles.includes(req.user.role)) {
    return sendError(res, 'No tienes permisos para realizar esta acción', 403);
  }
  return next();
};

module.exports = { authenticate, authorize };
