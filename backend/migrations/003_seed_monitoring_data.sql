-- =====================================================
-- Migración 003: Seed de datos de prueba para monitoreo
-- Fecha: 2026-10-01
-- =====================================================

-- 1. Insertar usuarios adicionales para monitoreo
INSERT INTO users (id, full_name, email, password_hash, role, phone)
VALUES 
  ('a1111111-1111-4111-a111-111111111111', 'Carlos Muñoz', 'carlos.munoz@wtracker.com', '$2b$12$H3zDznf.jXvPAgMewm582OXrywBSt8p0Hj30BPdPtlCSpmqj/8W3q', 'reponedor', '+59170011223'),
  ('a2222222-2222-4222-a222-222222222222', 'Ana López', 'ana.lopez@wtracker.com', '$2b$12$H3zDznf.jXvPAgMewm582OXrywBSt8p0Hj30BPdPtlCSpmqj/8W3q', 'vendedor', '+59170044556'),
  ('a3333333-3333-4333-a333-333333333333', 'Juan Pérez', 'juan.perez@wtracker.com', '$2b$12$H3zDznf.jXvPAgMewm582OXrywBSt8p0Hj30BPdPtlCSpmqj/8W3q', 'cobrador', '+59170077889'),
  ('a4444444-4444-4444-a444-444444444444', 'Roberto Díaz', 'roberto.diaz@wtracker.com', '$2b$12$H3zDznf.jXvPAgMewm582OXrywBSt8p0Hj30BPdPtlCSpmqj/8W3q', 'supervisor', '+59170099000')
ON CONFLICT (email) DO NOTHING;

-- 2. Insertar clientes de referencia
INSERT INTO clients (id, business_name, contact_name, phone, address, city, lat, lng, location, geofence_radius)
VALUES
  ('c1111111-1111-4111-a111-111111111111', 'Supermercado Central Norte', 'Roberto Díaz', '+59133345678', 'Av. Principal 1200', 'Santa Cruz', -17.78330000, -63.18210000, ST_MakePoint(-63.18210000, -17.78330000)::geography, 100),
  ('c2222222-2222-4222-a222-222222222222', 'Minimarket La Esquina', 'Carmen Rojas', '+59122298765', 'Calle Sur 45', 'La Paz', -16.48970000, -68.11930000, ST_MakePoint(-68.11930000, -16.48970000)::geography, 80),
  ('c3333333-3333-4333-a333-333333333333', 'Farmacia Popular', 'Luis Contreras', '+59144411122', 'Av. Las Palmas 890', 'Cochabamba', -17.38950000, -66.15680000, ST_MakePoint(-66.15680000, -17.38950000)::geography, 50)
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar visitas recientes para monitoreo en vivo (últimas 8 horas)
INSERT INTO visits (id, user_id, client_id, status, visit_lat, visit_lng, visit_location, distance_to_client, notes, started_at, completed_at, created_at)
VALUES
  ('b1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', 'c1111111-1111-4111-a111-111111111111', 'visitado', -17.78330000, -63.18210000, ST_MakePoint(-63.18210000, -17.78330000)::geography, 12, 'Reposición completada', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '40 minutes'),
  ('b2222222-2222-4222-a222-222222222222', 'a2222222-2222-4222-a222-222222222222', 'c2222222-2222-4222-a222-222222222222', 'en_ruta', -16.48970000, -68.11930000, ST_MakePoint(-68.11930000, -16.48970000)::geography, 150, 'En camino a punto de venta', NOW() - INTERVAL '30 minutes', NULL, NOW() - INTERVAL '30 minutes'),
  ('b3333333-3333-4333-a333-333333333333', 'a3333333-3333-4333-a333-333333333333', 'c3333333-3333-4333-a333-333333333333', 'fallido', -17.38950000, -66.15680000, ST_MakePoint(-66.15680000, -17.38950000)::geography, 45, 'Local cerrado', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 50 minutes', NOW() - INTERVAL '1 hour 50 minutes')
ON CONFLICT (id) DO NOTHING;
