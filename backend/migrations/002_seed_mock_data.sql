-- backend/migrations/002_seed_mock_data.sql

-- =====================================================
-- SEED DATA para pruebas (Mock pero reales)
-- =====================================================

-- 1. Usuarios (Reponedores y Supervisores)
-- Password para todos: password123
INSERT INTO users (id, full_name, email, password_hash, role, phone, is_active)
VALUES
('a1b2c3d4-e5f6-7890-1234-56789abcdef0', 'Juan Perez (Mock)', 'juan.mock@wtracker.com', '$2b$10$E24BO2p7UH7G0ECa7HtWUOHvk7Sib3aOIpxCVXM4LPfJNMYsDM/Ga', 'reponedor', '+59170000001', true),
('b2c3d4e5-f678-9012-3456-789abcdef012', 'Maria Gomez (Mock)', 'maria.mock@wtracker.com', '$2b$10$E24BO2p7UH7G0ECa7HtWUOHvk7Sib3aOIpxCVXM4LPfJNMYsDM/Ga', 'reponedor', '+59170000002', true),
('c3d4e5f6-7890-1234-5678-9abcdef01234', 'Carlos Ruiz (Mock)', 'carlos.mock@wtracker.com', '$2b$10$E24BO2p7UH7G0ECa7HtWUOHvk7Sib3aOIpxCVXM4LPfJNMYsDM/Ga', 'supervisor', '+59170000003', true)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

-- 2. Clientes (Mercados y Supermercados en Santa Cruz)
INSERT INTO clients (id, business_name, contact_name, phone, email, address, lat, lng, location, geofence_radius, is_active)
VALUES
('d4e5f6a1-b2c3-d4e5-f6a1-b2c3d4e5f6a1', 'Hipermaxi Norte', 'Ana Lopez', '+59170000004', 'contacto@hipermaxi.com', 'Av. Banzer 4to Anillo, Santa Cruz', -17.7501, -63.1702, ST_MakePoint(-63.1702, -17.7501)::geography, 100, true),
('e5f6a1b2-c3d4-e5f6-a1b2-c3d4e5f6a1b2', 'Fidalga Equipetrol', 'Roberto Guzman', '+59170000005', 'gerencia@fidalga.com', 'Av. San Martin, Santa Cruz', -17.7612, -63.1901, ST_MakePoint(-63.1901, -17.7612)::geography, 150, true),
('f6a1b2c3-d4e5-f6a1-b2c3-d4e5f6a1b2c3', 'Supermercado IC Norte', 'Carla Suarez', '+59170000006', 'info@icnorte.com.bo', 'Av. Busch 3er Anillo, Santa Cruz', -17.7705, -63.1930, ST_MakePoint(-63.1930, -17.7705)::geography, 120, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Visitas
INSERT INTO visits (id, user_id, client_id, status, visit_lat, visit_lng, started_at, completed_at)
VALUES
('11111111-2222-3333-4444-555555555555', 'a1b2c3d4-e5f6-7890-1234-56789abcdef0', 'd4e5f6a1-b2c3-d4e5-f6a1-b2c3d4e5f6a1', 'visitado', -17.7502, -63.1703, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
('22222222-3333-4444-5555-666666666666', 'a1b2c3d4-e5f6-7890-1234-56789abcdef0', 'e5f6a1b2-c3d4-e5f6-a1b2-c3d4e5f6a1b2', 'en_ruta', -17.7600, -63.1800, NOW() - INTERVAL '30 minutes', NULL),
('33333333-4444-5555-6666-777777777777', 'b2c3d4e5-f678-9012-3456-789abcdef012', 'f6a1b2c3-d4e5-f6a1-b2c3-d4e5f6a1b2c3', 'fallido', -17.7700, -63.1900, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;
