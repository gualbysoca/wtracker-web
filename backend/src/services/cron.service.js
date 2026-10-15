// src/services/cron.service.js
const cron = require('node-cron');
const { query } = require('../configs/database');
const eventBus = require('../utils/eventBus');
const { runEvidenceRetention } = require('./evidenceRetention.service');

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
          AND NOT EXISTS (
            SELECT 1 FROM visits v
            WHERE v.user_id = u.id
              AND v.status = 'en_ruta'
              AND DATE(v.created_at) = CURRENT_DATE
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

  // 3. Depuración de evidencias (antigüedad máxima + tope de almacenamiento)
  // Cada hora (minuto 15) y una vez al arrancar: en Cloudflare el contenedor duerme sin tráfico,
  // por lo que no se puede depender solo del horario.
  const runScheduledEvidenceRetention = () =>
    runEvidenceRetention().catch((err) => console.error('[Cron] Error en la depuración de evidencias:', err));
  cron.schedule('15 * * * *', runScheduledEvidenceRetention);
  runScheduledEvidenceRetention();

  console.log('[Cron] Servicios programados iniciados (Inactividad, Recolector Zombi y Depuración de evidencias).');
};

module.exports = { startCronJobs };
