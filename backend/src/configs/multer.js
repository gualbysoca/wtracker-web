// src/configs/multer.js
// Configuración de Multer para subida de evidencias (fotos y firmas)

const multer = require('multer');

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 10;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',   // Firmas digitales en SVG
  'application/octet-stream',
]);

// En memoria: el archivo se comprime y se envía al almacenamiento (disco o R2) desde
// evidence.service, que también genera el nombre único del objeto.
const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

const uploadEvidence = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

module.exports = { uploadEvidence };
