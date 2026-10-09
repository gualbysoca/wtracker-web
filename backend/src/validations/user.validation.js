// src/validations/user.validation.js
// Esquemas Zod para validación de datos de usuario

const { z } = require('zod');
const { isValidPhoneNumber } = require('libphonenumber-js');

const VALID_ROLES = ['admin', 'supervisor', 'reponedor', 'vendedor', 'cobrador', 'repartidor'];

const createUserSchema = z.object({
  full_name: z
    .string({ required_error: 'El nombre completo es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede superar los 120 caracteres')
    .trim(),
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('El email no tiene un formato válido')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  role: z
    .enum(VALID_ROLES, { errorMap: () => ({ message: `El rol debe ser uno de: ${VALID_ROLES.join(', ')}` }) }),
  phone: z
    .string()
    .max(30)
    .refine((val) => !val || isValidPhoneNumber(val), { message: 'Número de teléfono inválido' })
    .optional()
    .nullable(),
});

const updateUserSchema = createUserSchema
  .omit({ password: true })
  .extend({
    is_active: z.boolean().optional(),
    password:  z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .optional(),
  })
  .partial();

const paginationSchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role:   z.enum(VALID_ROLES).optional(),
  include_inactive: z.coerce.boolean().optional(),
});

module.exports = { createUserSchema, updateUserSchema, paginationSchema };
