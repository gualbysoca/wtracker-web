// src/services/evidenceRetention.service.js
// Depuración automática de evidencias: borra los archivos más antiguos cuando superan la
// antigüedad máxima o cuando el almacenamiento total supera el tope configurado.
// El registro se conserva (purged_at + imagen placeholder) para no romper historial ni métricas.

const { query } = require('../configs/database');
const { getEvidenceStorageSettings } = require('./setting.service');
const { deleteObject, extractKeyFromPublicUrl } = require('./objectStorage.service');
const { EVIDENCE_RETENTION_CONFIG, PURGED_EVIDENCE_PLACEHOLDER_URL } = require('../configs/storage');

const BYTES_PER_MB = 1024 * 1024;

let activeRetentionRun = null;
let lastPostUploadCheckAt = 0;

const deleteEvidenceFiles = async (evidenceRows) => {
  const deletedIds = [];
  for (const evidence of evidenceRows) {
    const objectKey = extractKeyFromPublicUrl(evidence.file_url);
    try {
      if (objectKey) await deleteObject(objectKey);
      deletedIds.push(evidence.id);
    } catch (error) {
      // Se reintenta en la próxima ejecución; el registro sigue activo.
      console.error('[Retention] No se pudo borrar el archivo de la evidencia', evidence.id, error.message);
    }
  }
  return deletedIds;
};

const markEvidencesAsPurged = async (evidenceIds) => {
  if (evidenceIds.length === 0) return 0;
  const result = await query(
    `UPDATE evidence SET purged_at = NOW(), file_url = $2
     WHERE id = ANY($1::uuid[]) AND purged_at IS NULL`,
    [evidenceIds, PURGED_EVIDENCE_PLACEHOLDER_URL],
  );
  return result.rowCount;
};

const purgeEvidenceRows = async (evidenceRows) => markEvidencesAsPurged(await deleteEvidenceFiles(evidenceRows));

const purgeEvidencesOlderThan = async (maxAgeDays) => {
  let purgedCount = 0;
  for (;;) {
    const { rows } = await query(
      `SELECT id, file_url FROM evidence
       WHERE purged_at IS NULL AND captured_at < NOW() - make_interval(days => $1::int)
       ORDER BY captured_at, id
       LIMIT $2`,
      [maxAgeDays, EVIDENCE_RETENTION_CONFIG.batchSize],
    );
    if (rows.length === 0) return purgedCount;

    const purgedInBatch = await purgeEvidenceRows(rows);
    purgedCount += purgedInBatch;
    // Si ningún archivo pudo borrarse, se corta para no reintentar en bucle.
    if (purgedInBatch === 0) return purgedCount;
  }
};

const purgeEvidencesAboveCap = async (storageCapBytes) => {
  const { rows: [usage] } = await query(
    'SELECT COALESCE(SUM(file_size), 0)::bigint AS used_bytes FROM evidence WHERE purged_at IS NULL',
  );
  const bytesToFree = Number(usage.used_bytes) - storageCapBytes;
  if (bytesToFree <= 0) return 0;

  // Las más antiguas primero, hasta liberar lo suficiente para volver bajo el tope.
  const { rows } = await query(
    `SELECT id, file_url FROM (
       SELECT id, file_url, COALESCE(file_size, 0) AS file_size,
              SUM(COALESCE(file_size, 0)) OVER (ORDER BY captured_at, id) AS cumulative_bytes
       FROM evidence
       WHERE purged_at IS NULL
     ) oldest_first
     WHERE cumulative_bytes - file_size < $1
     ORDER BY cumulative_bytes`,
    [bytesToFree],
  );
  return purgeEvidenceRows(rows);
};

const executeEvidenceRetention = async () => {
  const settings = await getEvidenceStorageSettings();
  if (!settings.retentionEnabled) return Object.freeze({ skipped: true, purgedByAge: 0, purgedByCap: 0 });

  const purgedByAge = await purgeEvidencesOlderThan(settings.retentionMaxDays);
  const purgedByCap = await purgeEvidencesAboveCap(settings.storageCapMb * BYTES_PER_MB);

  if (purgedByAge + purgedByCap > 0) {
    console.log(`[Retention] Evidencias depuradas — por antigüedad: ${purgedByAge}, por tope: ${purgedByCap}`);
  }
  return Object.freeze({ skipped: false, purgedByAge, purgedByCap });
};

/** Ejecuta la depuración evitando ejecuciones concurrentes (cron + subidas). */
const runEvidenceRetention = () => {
  if (!activeRetentionRun) {
    activeRetentionRun = executeEvidenceRetention().finally(() => {
      activeRetentionRun = null;
    });
  }
  return activeRetentionRun;
};

/** Verificación asíncrona y limitada en frecuencia tras cada subida (no bloquea la respuesta). */
const scheduleEvidenceRetentionCheck = () => {
  const now = Date.now();
  if (now - lastPostUploadCheckAt < EVIDENCE_RETENTION_CONFIG.postUploadCheckIntervalMs) return;

  lastPostUploadCheckAt = now;
  runEvidenceRetention().catch((error) => console.error('[Retention] Error en la depuración tras subida:', error));
};

const getEvidenceStorageUsage = async () => {
  const [settings, { rows: [usage] }] = await Promise.all([
    getEvidenceStorageSettings(),
    query(
      `SELECT
         COUNT(*) FILTER (WHERE purged_at IS NULL)::int                         AS active_count,
         COALESCE(SUM(file_size) FILTER (WHERE purged_at IS NULL), 0)::bigint   AS used_bytes,
         COUNT(*) FILTER (WHERE purged_at IS NOT NULL)::int                     AS purged_count,
         MAX(purged_at)                                                         AS last_purged_at,
         MIN(captured_at) FILTER (WHERE purged_at IS NULL)                      AS oldest_active_at
       FROM evidence`,
    ),
  ]);

  return Object.freeze({
    activeCount: usage.active_count,
    usedBytes: Number(usage.used_bytes),
    capBytes: settings.storageCapMb * BYTES_PER_MB,
    purgedCount: usage.purged_count,
    lastPurgedAt: usage.last_purged_at,
    oldestActiveAt: usage.oldest_active_at,
  });
};

module.exports = { runEvidenceRetention, scheduleEvidenceRetentionCheck, getEvidenceStorageUsage };
