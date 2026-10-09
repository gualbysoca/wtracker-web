-- =====================================================
-- Migración 002: Agregar columna city a la tabla clients
-- Fecha: 2026-10-01
-- =====================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS city VARCHAR(100);
