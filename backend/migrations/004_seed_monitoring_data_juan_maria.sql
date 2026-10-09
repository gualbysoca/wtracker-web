-- =====================================================
-- Migración 004: Seed de datos reales para Juan Perez y Maria Gomez en monitoreo
-- Fecha: 2026-10-02
-- =====================================================

-- 1. Asegurarnos que Maria Gomez exista (Juan Perez ya existe, pero hacemos un UPSERT por si acaso)
INSERT INTO users (id, full_name, email, password_hash, role, phone)
VALUES 
  ('a3333333-3333-4333-a333-333333333333', 'Juan Pérez', 'juan.perez@wtracker.com', '$2b$12$H3zDznf.jXvPAgMewm582OXrywBSt8p0Hj30BPdPtlCSpmqj/8W3q', 'cobrador', '+59170077889'),
  ('a5555555-5555-5555-a555-555555555555', 'Maria Gomez', 'maria.gomez@wtracker.com', '$2b$12$H3zDznf.jXvPAgMewm582OXrywBSt8p0Hj30BPdPtlCSpmqj/8W3q', 'vendedor', '+59170088990')
ON CONFLICT (email) DO NOTHING;

-- 2. Asegurarnos de que haya clientes para visitar
INSERT INTO clients (id, business_name, contact_name, phone, address, city, lat, lng, location, geofence_radius)
VALUES
  ('c4444444-4444-4444-a444-444444444444', 'Tienda Los Robles', 'Pedro Martinez', '+59133345678', 'Av. Las Palmas 500', 'Santa Cruz', -17.78530000, -63.18410000, ST_MakePoint(-63.18410000, -17.78530000)::geography, 100),
  ('c5555555-5555-5555-a555-555555555555', 'Farmacia Bienestar', 'Ana Silva', '+59122298765', 'Calle Central 200', 'Santa Cruz', -17.78000000, -63.18000000, ST_MakePoint(-63.18000000, -17.78000000)::geography, 80)
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar visitas para hacerlos aparecer activos en el monitoreo (últimas 8 horas)
INSERT INTO visits (id, user_id, client_id, status, visit_lat, visit_lng, visit_location, distance_to_client, notes, started_at, completed_at, created_at)
VALUES
  ('b4444444-4444-4444-a444-444444444444', 'a3333333-3333-4333-a333-333333333333', 'c4444444-4444-4444-a444-444444444444', 'en_ruta', -17.78500000, -63.18400000, ST_MakePoint(-63.18400000, -17.78500000)::geography, 150, 'En camino a la tienda', NOW() - INTERVAL '15 minutes', NULL, NOW() - INTERVAL '15 minutes'),
  ('b5555555-5555-5555-a555-555555555555', 'a5555555-5555-5555-a555-555555555555', 'c5555555-5555-5555-a555-555555555555', 'visitado', -17.78010000, -63.18010000, ST_MakePoint(-63.18010000, -17.78010000)::geography, 10, 'Visita completada exitosamente', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 30 minutes', NOW() - INTERVAL '1 hour 30 minutes')
ON CONFLICT (id) DO UPDATE SET 
  status = EXCLUDED.status,
  visit_lat = EXCLUDED.visit_lat,
  visit_lng = EXCLUDED.visit_lng,
  visit_location = EXCLUDED.visit_location,
  created_at = NOW();
