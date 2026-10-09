// src/services/auth.service.js
// Lógica de negocio de autenticación — separada de los controladores

const bcrypt        = require('bcryptjs');
const crypto        = require('crypto');
const { query }     = require('../configs/database');
const jwtConfig     = require('../configs/jwt');
const { LOGIN_CHANNELS } = require('../configs/roles');

const SALT_ROUNDS = 12;

/**
 * Autentica un usuario con email y password.
 * @param {{ email: string, password: string }} credentials
 * @param {'web'|'mobile'} channel - Canal de acceso; define qué roles pueden autenticarse
 * @returns {{ accessToken, refreshToken, user }}
 * @throws {Error} con statusCode si las credenciales son inválidas o el rol no tiene acceso al canal
 */
const loginUser = async ({ email, password }, channel = 'web') => {
  const channelPolicy = LOGIN_CHANNELS[channel];
  if (!channelPolicy) {
    const err = new Error(`Canal de login no soportado: ${channel}`);
    err.statusCode = 400;
    throw err;
  }

  const result = await query(
    `SELECT id, full_name, email, password_hash, role, is_active, avatar_url
     FROM users
     WHERE email = $1 AND is_deleted = FALSE
     LIMIT 1`,
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Tu cuenta está desactivada. Contacta al administrador.');
    err.statusCode = 403;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  if (!channelPolicy.allowedRoles.includes(user.role)) {
    const err = new Error(channelPolicy.deniedMessage);
    err.statusCode = 403;
    throw err;
  }

  const tokenPayload = {
    id:    user.id,
    email: user.email,
    role:  user.role,
    name:  user.full_name,
  };

  const accessToken  = jwtConfig.generateAccessToken(tokenPayload);
  const refreshToken = jwtConfig.generateRefreshToken({ id: user.id });

  // Almacenar hash del refresh token (no el token en texto plano)
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  const { password_hash: _, ...safeUser } = user;

  return { accessToken, refreshToken, user: safeUser };
};

/**
 * Renueva el access token usando un refresh token válido.
 */
const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwtConfig.verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error('Refresh token inválido o expirado');
    err.statusCode = 401;
    throw err;
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const storedToken = await query(
    `SELECT id FROM refresh_tokens
     WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()
     LIMIT 1`,
    [decoded.id, tokenHash]
  );

  if (storedToken.rowCount === 0) {
    const err = new Error('Refresh token inválido o revocado');
    err.statusCode = 401;
    throw err;
  }

  const userResult = await query(
    `SELECT id, full_name, email, role FROM users WHERE id = $1 AND is_active = TRUE AND is_deleted = FALSE`,
    [decoded.id]
  );

  if (userResult.rowCount === 0) {
    const err = new Error('Usuario no encontrado');
    err.statusCode = 401;
    throw err;
  }

  const user = userResult.rows[0];
  const newAccessToken = jwtConfig.generateAccessToken({
    id:    user.id,
    email: user.email,
    role:  user.role,
    name:  user.full_name,
  });

  return { accessToken: newAccessToken };
};

/**
 * Revoca el refresh token (logout)
 */
const logoutUser = async (refreshToken) => {
  if (!refreshToken) return;
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query(
    `DELETE FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash]
  );
};

/**
 * Hashea una contraseña con bcrypt
 */
const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);

module.exports = { loginUser, refreshAccessToken, logoutUser, hashPassword };
