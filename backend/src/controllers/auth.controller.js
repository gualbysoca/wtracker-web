// src/controllers/auth.controller.js
// Controladores de autenticación — sólo orquestan service + formatter

const authService = require('../services/auth.service');
const { loginSchema, refreshSchema } = require('../validations/auth.validation');
const { sendSuccess, sendError }     = require('../utils/responseFormatter');

const createLoginHandler = (channel) => async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Datos de login inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const result = await authService.loginUser(parsed.data, channel);
    return sendSuccess(res, result, 'Login exitoso');
  } catch (error) {
    return next(error);
  }
};

const login       = createLoginHandler('web');
const mobileLogin = createLoginHandler('mobile');

const refresh = async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Refresh token inválido', 400);
    }

    const result = await authService.refreshAccessToken(parsed.data.refreshToken);
    return sendSuccess(res, result, 'Token renovado');
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logoutUser(refreshToken);
    return sendSuccess(res, null, 'Sesión cerrada correctamente');
  } catch (error) {
    return next(error);
  }
};

const getProfile = (req, res) => {
  // req.user viene del middleware authenticate
  return sendSuccess(res, req.user, 'Perfil de usuario');
};

module.exports = { login, mobileLogin, refresh, logout, getProfile };
