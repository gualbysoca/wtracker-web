// src/configs/multer.js
// Configuración de Multer para subida de evidencias (fotos y firmas)

const multer = require('multer');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 10;
const UPLOAD_DIR_ENV   = process.env.UPLOAD_DIR || 'uploads';
const UPLOAD_DIR       = require('path').isAbsolute(UPLOAD_DIR_ENV)
  ? UPLOAD_DIR_ENV
  : require('path').join(__dirname, '../../', UPLOAD_DIR_ENV);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',   // Firmas digitales en SVG
  'application/octet-stream',
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, UPLOAD_DIR);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${extension}`;
    callback(null, uniqueName);
  },
});

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
