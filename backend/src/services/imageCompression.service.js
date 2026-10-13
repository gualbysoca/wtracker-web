// src/services/imageCompression.service.js
// Wrapper de compresión de imágenes (sharp). Si se cambia de librería, solo se edita este archivo.

const sharp = require('sharp');

// application/octet-stream: algunas versiones de la app móvil envían fotos sin MIME específico.
const COMPRESSIBLE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/octet-stream']);

const COMPRESSED_OUTPUT = Object.freeze({ mimeType: 'image/webp', extension: '.webp' });

/**
 * Redimensiona (sin agrandar) y convierte a WebP. Las firmas usan WebP sin pérdida para no
 * degradar los trazos. Devuelve null si el archivo no es una imagen comprimible o si la
 * versión comprimida no es más liviana que la original.
 */
const compressImage = async (buffer, mimeType, { maxDimensionPx, quality, isSignature }) => {
  if (!COMPRESSIBLE_MIME_TYPES.has(mimeType)) return null;

  let compressedBuffer;
  try {
    compressedBuffer = await sharp(buffer, { failOn: 'none' })
      .rotate() // Aplica la orientación EXIF antes de descartar metadatos
      .resize({ width: maxDimensionPx, height: maxDimensionPx, fit: 'inside', withoutEnlargement: true })
      .webp(isSignature ? { lossless: true } : { quality, effort: 4 })
      .toBuffer();
  } catch (error) {
    // Nunca bloquear una subida por compresión (la app móvil reintentaría indefinidamente):
    // se registra el problema y se guarda el original.
    console.warn('[Compression] No se pudo comprimir la evidencia; se guarda el original:', error.message);
    return null;
  }

  if (compressedBuffer.length >= buffer.length) return null;
  return { buffer: compressedBuffer, ...COMPRESSED_OUTPUT };
};

module.exports = { compressImage };
