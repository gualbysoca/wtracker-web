// src/configs/storage.js
// Configuración del almacenamiento de archivos de evidencia y de su política de retención.

const path = require('path');

const UPLOAD_DIR_ENV = process.env.UPLOAD_DIR || 'uploads';
const UPLOAD_DIR = path.isAbsolute(UPLOAD_DIR_ENV)
  ? UPLOAD_DIR_ENV
  : path.join(__dirname, '../../', UPLOAD_DIR_ENV);

const STORAGE_DRIVERS = Object.freeze({
  localDisk: 'local',
  workerR2:  'r2-worker',
});

const STORAGE_CONFIG = Object.freeze({
  driver:      process.env.STORAGE_DRIVER || STORAGE_DRIVERS.localDisk,
  uploadDir:   UPLOAD_DIR,
  publicPrefix: '/uploads/',
  // Solo para el driver r2-worker: endpoint interno del Worker con el binding de R2.
  proxyUrl:    process.env.STORAGE_PROXY_URL || '',
  proxyToken:  process.env.STORAGE_PROXY_TOKEN || '',
  proxyTimeoutMs: 15000,
});

// Imagen mostrada en el panel cuando el archivo de una evidencia fue depurado.
const PURGED_EVIDENCE_PLACEHOLDER_URL = '/evidence-purged.svg';

const EVIDENCE_SETTING_KEYS = Object.freeze({
  compressionEnabled: 'evidence_compression_enabled',
  maxDimensionPx:     'evidence_max_dimension_px',
  imageQuality:       'evidence_image_quality',
  retentionEnabled:   'evidence_retention_enabled',
  storageCapMb:       'evidence_storage_cap_mb',
  retentionMaxDays:   'evidence_retention_max_days',
});

const EVIDENCE_SETTING_DEFAULTS = Object.freeze({
  compressionEnabled: true,
  maxDimensionPx:     1280,
  imageQuality:       60,
  retentionEnabled:   true,
  storageCapMb:       9216, // 9 GB: margen bajo los 10 GB gratuitos de R2
  retentionMaxDays:   90,
});

const EVIDENCE_SETTING_LIMITS = Object.freeze({
  maxDimensionPx:   { min: 480, max: 4096 },
  imageQuality:     { min: 30, max: 95 },
  storageCapMb:     { min: 100, max: 102400 },
  retentionMaxDays: { min: 1, max: 3650 },
});

const EVIDENCE_RETENTION_CONFIG = Object.freeze({
  batchSize: 200,
  // Tras una subida, como mucho una verificación de tope cada 10 minutos.
  postUploadCheckIntervalMs: 10 * 60 * 1000,
});

module.exports = {
  STORAGE_DRIVERS,
  STORAGE_CONFIG,
  PURGED_EVIDENCE_PLACEHOLDER_URL,
  EVIDENCE_SETTING_KEYS,
  EVIDENCE_SETTING_DEFAULTS,
  EVIDENCE_SETTING_LIMITS,
  EVIDENCE_RETENTION_CONFIG,
};
