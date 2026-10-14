// src/validations/client.validation.js
// Esquemas Zod para validación de clientes

const { z } = require('zod');
const { isValidPhoneNumber } = require('libphonenumber-js');

const emptyToNull = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
  z.string().max(500).optional().nullable()
);

const emptyEmailToNull = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
  z.string().email().toLowerCase().optional().nullable()
);

const emptyPhoneToNull = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
  z.string().max(30).refine((val) => !val || isValidPhoneNumber(val), { message: 'Número de teléfono inválido' }).optional().nullable()
);

const createClientSchema = z.object({
  business_name: z
    .string({ required_error: 'El nombre del negocio es requerido' })
    .min(2).max(200).trim(),
  contact_name:  emptyToNull,
  phone:         emptyPhoneToNull,
  email:         emptyEmailToNull,
  address:       emptyToNull,
  city:          emptyToNull,
  lat: z
    .number({ required_error: 'La latitud GPS es requerida' })
    .min(-90).max(90),
  lng: z
    .number({ required_error: 'La longitud GPS es requerida' })
    .min(-180).max(180),
  notes:           emptyToNull,
});

const updateClientSchema = createClientSchema.partial();

const clientQuerySchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(500).default(20),
  search: z.string().optional(),
});

const BULK_MAX_ROWS = 1000;
const BULK_ACTIONS = ['create', 'update', 'delete'];

const bulkClientsSchema = z.object({
  rows: z
    .array(
      z.object({
        line:   z.number().int().positive(),
        action: z.enum(BULK_ACTIONS),
        id:     z.string().uuid().optional(),
        data:   z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1, 'El archivo no contiene filas')
    .max(BULK_MAX_ROWS, `Máximo ${BULK_MAX_ROWS} filas por carga`),
});

module.exports = { createClientSchema, updateClientSchema, clientQuerySchema, bulkClientsSchema, BULK_MAX_ROWS };
