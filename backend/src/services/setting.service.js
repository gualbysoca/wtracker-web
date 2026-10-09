const { query } = require('../configs/database');

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

module.exports = {
  getAllSettings,
  updateSettings,
};
