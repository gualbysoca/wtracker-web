// src/validations/location.validation.js
const { z } = require('zod');

const locationItemSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timestamp: z.string().datetime().optional(),
  accuracy: z.number().optional(),
  isMockLocation: z.boolean().optional(),
});

const locationBatchSchema = z.array(locationItemSchema).min(1, 'Debe enviar al menos una ubicación');

module.exports = {
  locationBatchSchema,
};
