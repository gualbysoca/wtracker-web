// src/services/location.service.js
const { query } = require('../configs/database');
const eventBus = require('../utils/eventBus');

/**
 * Guarda un lote de ubicaciones de un usuario en la base de datos
 */
const saveLocationBatch = async (userId, locations) => {
  if (!locations || locations.length === 0) return 0;

  let savedCount = 0;
  for (const loc of locations) {
    const lat = loc.lat;
    const lng = loc.lng;
    const accuracy = loc.accuracy || null;
    const isMockLocation = loc.isMockLocation || false;
    const capturedAt = loc.timestamp ? new Date(loc.timestamp) : new Date();

    await query(
      `INSERT INTO user_locations
         (user_id, lat, lng, location, accuracy, is_mock_location, captured_at)
       VALUES
         ($1::uuid, $2::numeric, $3::numeric, ST_SetSRID(ST_MakePoint($3::numeric, $2::numeric), 4326)::geography, $4::numeric, $5::boolean, $6::timestamptz)`,
      [userId, lat, lng, accuracy, isMockLocation, capturedAt]
    );
    savedCount++;
  }

  if (savedCount > 0) {
    // Reconexión Automática: Si el usuario estaba marcado como inactivo (is_on_shift = FALSE) 
    // pero aún tiene una tarea 'en_ruta' vigente, lo reconectamos al mapa.
    const res = await query(
      `UPDATE users 
       SET is_on_shift = TRUE 
       WHERE id = $1 AND is_on_shift = FALSE 
         AND EXISTS (
           SELECT 1 FROM visits 
           WHERE user_id = $1 AND status = 'en_ruta' AND DATE(created_at) = CURRENT_DATE
         )`,
      [userId]
    );

    if (res.rowCount > 0) {
      console.log(`[LocationService] Usuario ${userId} reconectado automáticamente (en ruta).`);
    }

    eventBus.emit('map_update');
  }

  return savedCount;
};

module.exports = {
  saveLocationBatch,
};
