-- =====================================================
-- Migration: 002_add_user_soft_delete
-- Description: Agrega columna is_deleted a la tabla users para borrado logico
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
