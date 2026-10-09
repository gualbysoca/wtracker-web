-- =====================================================
-- Migration: 002_add_repartidor_role
-- Description: Agrega el rol 'repartidor' al enum user_role
-- Created: 2026-09-30
-- =====================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'repartidor';
