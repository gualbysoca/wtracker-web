// src/validations/setting.validation.js
// Valida los settings de evidencias; el resto de settings existentes se acepta sin cambios.
const { z } = require('zod');
const { EVIDENCE_SETTING_KEYS, EVIDENCE_SETTING_LIMITS } = require('../configs/storage');

const booleanSetting = z.union([z.boolean(), z.enum(['true', 'false'])]).transform((value) => String(value));

const integerSetting = ({ min, max }, label) =>
  z.coerce
    .number({ message: `${label} debe ser un número` })
    .int(`${label} debe ser un número entero`)
    .min(min, `${label} debe ser al menos ${min}`)
    .max(max, `${label} no puede superar ${max}`)
    .transform((value) => String(value));

const updateSettingsSchema = z.looseObject({
  [EVIDENCE_SETTING_KEYS.compressionEnabled]: booleanSetting.optional(),
  [EVIDENCE_SETTING_KEYS.maxDimensionPx]: integerSetting(EVIDENCE_SETTING_LIMITS.maxDimensionPx, 'El tamaño máximo').optional(),
  [EVIDENCE_SETTING_KEYS.imageQuality]: integerSetting(EVIDENCE_SETTING_LIMITS.imageQuality, 'La calidad').optional(),
  [EVIDENCE_SETTING_KEYS.retentionEnabled]: booleanSetting.optional(),
  [EVIDENCE_SETTING_KEYS.storageCapMb]: integerSetting(EVIDENCE_SETTING_LIMITS.storageCapMb, 'El tope de almacenamiento').optional(),
  [EVIDENCE_SETTING_KEYS.retentionMaxDays]: integerSetting(EVIDENCE_SETTING_LIMITS.retentionMaxDays, 'La antigüedad máxima').optional(),
});

module.exports = { updateSettingsSchema };
