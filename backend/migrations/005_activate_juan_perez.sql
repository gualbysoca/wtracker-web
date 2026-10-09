-- =====================================================
-- Migración 005: Activar a Juan Perez
-- Fecha: 2026-10-02
-- =====================================================

UPDATE users SET is_active = true WHERE full_name = 'Juan Pérez';
