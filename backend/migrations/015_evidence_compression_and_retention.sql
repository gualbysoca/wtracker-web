-- =====================================================
-- Migration: 015_evidence_compression_and_retention
-- Description: Compresión de imágenes y depuración automática de evidencias antiguas.
--   - evidence.purged_at: marca evidencias cuyo archivo fue borrado (se conserva el registro:
--     fecha, GPS y tipo) para no romper historial, métricas ni gamificación.
--   - Settings nuevos (habilitados por defecto) editables desde Configuraciones.
-- Created: 2026-10-12
-- =====================================================

ALTER TABLE evidence ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ;

-- Acelera la búsqueda de las evidencias activas más antiguas (candidatas a depurar)
CREATE INDEX IF NOT EXISTS idx_evidence_active_captured_at
  ON evidence (captured_at, id)
  WHERE purged_at IS NULL;

INSERT INTO settings (key, value, description) VALUES
  ('evidence_compression_enabled', 'true', 'Comprimir fotos de evidencia (WebP) al subirlas'),
  ('evidence_max_dimension_px', '1280', 'Lado máximo en píxeles de las fotos de evidencia comprimidas'),
  ('evidence_image_quality', '60', 'Calidad de compresión WebP (30-95) de las fotos de evidencia'),
  ('evidence_retention_enabled', 'true', 'Borrar automáticamente las evidencias más antiguas'),
  ('evidence_storage_cap_mb', '9216', 'Tope de almacenamiento de evidencias en MB (se borran las más antiguas al superarlo)'),
  ('evidence_retention_max_days', '90', 'Antigüedad máxima en días de los archivos de evidencia')
ON CONFLICT (key) DO NOTHING;
