-- =====================================================
-- Migration: 016_drop_client_geofence_radius
-- Description: El radio de tolerancia es ahora global (settings.geofence_radius, editable en
--   Configuraciones > Geofence y Tolerancia). Se elimina la columna por cliente, que ya no se usa.
-- =====================================================

ALTER TABLE clients DROP COLUMN IF EXISTS geofence_radius;
