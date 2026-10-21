-- =====================================================
-- Migration: 017_add_mobile_checkout_fields_to_clients
-- Description: Agrega campos requeridos para checkout móvil y WooCommerce:
--   client_code, delivery_address y stall_number a la tabla clients.
-- =====================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS stall_number VARCHAR(50);

-- Comentarios descriptivos en PostgreSQL
COMMENT ON COLUMN clients.client_code IS 'Código comercial o ID del cliente en el sistema/WooCommerce';
COMMENT ON COLUMN clients.delivery_address IS 'Dirección de entrega específica del cliente';
COMMENT ON COLUMN clients.stall_number IS 'Número de puesto del cliente en el mercado (alias nro_puesto)';

-- Índice para acelerar búsquedas y sincronización por código comercial
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON clients(client_code);
