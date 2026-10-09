// src/configs/jwt.js
// Wrapper para operaciones JWT — centraliza secret, algoritmo y expiración
// Si cambiamos de jsonwebtoken a jose, solo editamos este archivo

const jwt = require('jsonwebtoken');

const JWT_CONFIG = {
  access: {
    secret:    process.env.JWT_SECRET          || 'dev_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN      || '15m',
  },
  refresh: {
    secret:    process.env.JWT_REFRESH_SECRET  || 'dev_refresh_secret_change_in_production',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
};

/**
 * Genera un JWT de acceso con el payload dado
 * @param {object} payload - Datos del usuario (id, role, email)
 * @returns {string} Token firmado
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, JWT_CONFIG.access.secret, { expiresIn: JWT_CONFIG.access.expiresIn });

/**
 * Genera un JWT de refresh
 * @param {object} payload - Solo el id del usuario
 * @returns {string} Token firmado
 */
const generateRefreshToken = (payload) =>
  jwt.sign(payload, JWT_CONFIG.refresh.secret, { expiresIn: JWT_CONFIG.refresh.expiresIn });

/**
 * Verifica y decodifica un access token
 * @throws {jwt.JsonWebTokenError} si inválido o expirado
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, JWT_CONFIG.access.secret);

/**
 * Verifica y decodifica un refresh token
 * @throws {jwt.JsonWebTokenError} si inválido o expirado
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, JWT_CONFIG.refresh.secret);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
