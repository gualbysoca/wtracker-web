// src/services/cron.service.js
const cron = require('node-cron');
const { query } = require('../configs/database');
const eventBus = require('../utils/eventBus');

const startCronJobs = () => {
  // 1. Desconexión Visual (Cron de inactividad de 30 min)
  // Se ejecuta cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    try {
      const res = await query(`
        UPDATE users u
        SET is_on_shift = FALSE
        WHERE u.is_on_shift = TRUE
          AND u.role IN ('reponedor', 'vendedor', 'cobrador', 'repartidor')
          AND NOT EXISTS (
            SELECT 1 FROM user_locations ul 
            WHERE ul.user_id = u.id 
              AND ul.captured_at >= NOW() - INTERVAL '30 minutes'
          )
      `);
      
      if (res.rowCount > 0) {
        console.log(`[Cron] Desconectados ${res.rowCount} usuarios por inactividad visual (>30m).`);
        eventBus.emit('map_update');
      }
    } catch (err) {
      console.error('[Cron] Error en el cron de inactividad:', err);
    }
  });

  // 2. Recolector de Tareas Zombis (Abandono extremo > 4 horas)
  // Se ejecuta en el minuto 0 de cada hora (cada hora)
  cron.schedule('0 * * * *', async () => {
    try {
      const res = await query(`
        WITH stale_visits AS (
          SELECT v.id
          FROM visits v
          LEFT JOIN LATERAL (
            SELECT captured_at FROM user_locations ul
            WHERE ul.user_id = v.user_id
            ORDER BY captured_at DESC LIMIT 1
          ) last_loc ON true
          WHERE v.status = 'en_ruta'
            AND COALESCE(last_loc.captured_at, v.created_at) < NOW() - INTERVAL '4 hours'
        )
        UPDATE visits
        SET status = 'fallido',
            notes = COALESCE(notes || CHR(10), '') || 'Cierre automático por abandono extremo (>4 horas sin actividad)'
        WHERE id IN (SELECT id FROM stale_visits)
      `);
      
      if (res.rowCount > 0) {
        console.log(`[Cron] Cerradas ${res.rowCount} tareas zombis por abandono extremo (>4h).`);
        eventBus.emit('map_update'); // Refresca el mapa para quitar marcadores si es necesario
      }
    } catch (err) {
      console.error('[Cron] Error en el cron de tareas zombis:', err);
    }
  });

  console.log('[Cron] Servicios programados iniciados (Inactividad y Recolector Zombi).');
};

module.exports = { startCronJobs };
