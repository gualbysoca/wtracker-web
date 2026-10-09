// src/validations/auth.validation.js
// Esquemas Zod para validación de datos de autenticación

const { z } = require('zod');

const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('El email no tiene un formato válido')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const refreshSchema = z.object({
  refreshToken: z.string({ required_error: 'El refresh token es requerido' }),
});

module.exports = { loginSchema, refreshSchema };
