// src/services/evidence.service.js
// Registro de evidencias: compresión opcional, almacenamiento del archivo y persistencia en BD.

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../configs/database');
const { getEvidenceStorageSettings } = require('./setting.service');
const { compressImage } = require('./imageCompression.service');
const { putObject, deleteObject, buildPublicUrl } = require('./objectStorage.service');
const { scheduleEvidenceRetentionCheck } = require('./evidenceRetention.service');

const SIGNATURE_EVIDENCE_TYPE = 'firma_digital';
const DEFAULT_EVIDENCE_TYPE = 'foto';

const prepareEvidenceFile = async (file, evidenceType, settings) => {
  const original = Object.freeze({
    buffer: file.buffer,
    mimeType: file.mimetype,
    extension: path.extname(file.originalname || '').toLowerCase(),
  });
  if (!settings.compressionEnabled) return original;

  const compressed = await compressImage(file.buffer, file.mimetype, {
    maxDimensionPx: settings.maxDimensionPx,
    quality: settings.imageQuality,
    isSignature: evidenceType === SIGNATURE_EVIDENCE_TYPE,
  });
  return compressed ?? original;
};

const createEvidence = async ({ visitId, file, type, lat, lng, capturedAt }) => {
  const evidenceType = type || DEFAULT_EVIDENCE_TYPE;
  const settings = await getEvidenceStorageSettings();
  const storedFile = await prepareEvidenceFile(file, evidenceType, settings);
  const objectKey = `${uuidv4()}${storedFile.extension}`;

  await putObject(objectKey, storedFile.buffer, storedFile.mimeType);

  let result;
  try {
    result = await query(
      `INSERT INTO evidence (visit_id, type, file_url, file_name, file_size, mime_type, lat, lng, captured_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, visit_id, type, file_url, lat, lng, captured_at, created_at`,
      [
        visitId,
        evidenceType,
        buildPublicUrl(objectKey),
        file.originalname,
        storedFile.buffer.length,
        storedFile.mimeType,
        lat || null,
        lng || null,
        capturedAt ? new Date(capturedAt) : new Date(),
      ],
    );
  } catch (error) {
    // Evita archivos huérfanos si el registro no se pudo guardar (ej: visita inexistente).
    await deleteObject(objectKey).catch((cleanupError) =>
      console.error('[Evidence] No se pudo limpiar el archivo huérfano', objectKey, cleanupError),
    );
    throw error;
  }

  scheduleEvidenceRetentionCheck();
  return result.rows[0];
};

module.exports = { createEvidence };
