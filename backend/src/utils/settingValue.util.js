// src/utils/settingValue.util.js
// Los settings se guardan como JSONB y pueden llegar como boolean/number o como string
// (el panel envía strings). Estas funciones normalizan el valor con un fallback seguro.

const parseBooleanSetting = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const parseNumberSetting = (value, fallback, { min, max } = {}) => {
  const parsed = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(parsed)) return fallback;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
};

module.exports = { parseBooleanSetting, parseNumberSetting };
