const { query } = require('../configs/database');
const {
  EVIDENCE_SETTING_KEYS,
  EVIDENCE_SETTING_DEFAULTS,
  EVIDENCE_SETTING_LIMITS,
} = require('../configs/storage');
const { parseBooleanSetting, parseNumberSetting } = require('../utils/settingValue.util');

const getAllSettings = async () => {
  const result = await query('SELECT key, value FROM settings');
  const settings = {};
  result.rows.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
};

const updateSettings = async (settings) => {
  const keys = Object.keys(settings);
  for (const key of keys) {
    const value = settings[key];
    await query('UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2', [JSON.stringify(value), key]);
  }
  return await getAllSettings();
};

/**
 * Configuración tipada de compresión y retención de evidencias, con defaults seguros
 * si algún setting falta o tiene un valor inválido.
 */
const getEvidenceStorageSettings = async () => {
  const result = await query('SELECT key, value FROM settings WHERE key = ANY($1::text[])', [
    Object.values(EVIDENCE_SETTING_KEYS),
  ]);
  const rawValues = Object.fromEntries(result.rows.map((row) => [row.key, row.value]));

  return Object.freeze({
    compressionEnabled: parseBooleanSetting(
      rawValues[EVIDENCE_SETTING_KEYS.compressionEnabled],
      EVIDENCE_SETTING_DEFAULTS.compressionEnabled,
    ),
    maxDimensionPx: parseNumberSetting(
      rawValues[EVIDENCE_SETTING_KEYS.maxDimensionPx],
      EVIDENCE_SETTING_DEFAULTS.maxDimensionPx,
      EVIDENCE_SETTING_LIMITS.maxDimensionPx,
    ),
    imageQuality: parseNumberSetting(
      rawValues[EVIDENCE_SETTING_KEYS.imageQuality],
      EVIDENCE_SETTING_DEFAULTS.imageQuality,
      EVIDENCE_SETTING_LIMITS.imageQuality,
    ),
    retentionEnabled: parseBooleanSetting(
      rawValues[EVIDENCE_SETTING_KEYS.retentionEnabled],
      EVIDENCE_SETTING_DEFAULTS.retentionEnabled,
    ),
    storageCapMb: parseNumberSetting(
      rawValues[EVIDENCE_SETTING_KEYS.storageCapMb],
      EVIDENCE_SETTING_DEFAULTS.storageCapMb,
      EVIDENCE_SETTING_LIMITS.storageCapMb,
    ),
    retentionMaxDays: parseNumberSetting(
      rawValues[EVIDENCE_SETTING_KEYS.retentionMaxDays],
      EVIDENCE_SETTING_DEFAULTS.retentionMaxDays,
      EVIDENCE_SETTING_LIMITS.retentionMaxDays,
    ),
  });
};

module.exports = {
  getAllSettings,
  updateSettings,
  getEvidenceStorageSettings,
};
