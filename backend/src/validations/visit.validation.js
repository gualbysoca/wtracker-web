// src/validations/visit.validation.js
// Esquemas Zod para validación de visitas y evidencias

const { z } = require('zod');

const VALID_STATUSES = ['en_ruta', 'visitado', 'fallido'];

const createVisitSchema = z.object({
  client_id: z
    .string({ required_error: 'El ID del cliente es requerido' })
    .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i, 'El ID del cliente debe ser un UUID válido'),
  status: z
    .enum(VALID_STATUSES, {
      errorMap: () => ({ message: `El estado debe ser uno de: ${VALID_STATUSES.join(', ')}` }),
    }),
  lat: z
    .number({ required_error: 'La latitud es requerida' })
    .min(-90).max(90),
  lng: z
    .number({ required_error: 'La longitud es requerida' })
    .min(-180).max(180),
  notes: z.string().max(500).optional(),
  timestamp: z
    .string()
    .datetime({ message: 'El timestamp debe ser una fecha ISO 8601 válida' })
    .optional(),
  evidences: z.array(z.any()).optional(),
}).superRefine((data, ctx) => {
  // Asegurar explícitamente que no se requiera evidencia en 'en_ruta'
  if (data.status === 'en_ruta' && data.evidences && data.evidences.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'No se deben enviar evidencias cuando el estado es en_ruta',
      path: ['evidences'],
    });
  }
});

const updateVisitStatusSchema = z.object({
  status: z.enum(VALID_STATUSES, {
    errorMap: () => ({ message: `El estado debe ser uno de: ${VALID_STATUSES.join(', ')}` }),
  }),
  lat:   z.number().min(-90).max(90).optional(),
  lng:   z.number().min(-180).max(180).optional(),
  notes: z.string().max(500).optional(),
});

const visitQuerySchema = z.object({
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().positive().max(100).default(20),
  search:    z.string().optional(),
  user_id:   z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i).optional(),
  client_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i).optional(),
  status:    z.enum(VALID_STATUSES).optional(),
  date_from: z.string().datetime().optional(),
  date_to:   z.string().datetime().optional(),
});

module.exports = { createVisitSchema, updateVisitStatusSchema, visitQuerySchema };
