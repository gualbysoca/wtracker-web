-- Migración 008: Añadir 5 tareas más al usuario Juan Pérez (user_id: a3333333-3333-4333-a333-333333333333)

-- 1. Insertar 5 clientes nuevos para visitar
INSERT INTO clients (id, business_name, contact_name, phone, address, city, lat, lng, location, geofence_radius)
VALUES
  ('c6666666-6666-6666-a666-666666666666', 'Mercado Central Puesto 12', 'Carlos Mamani', '+59111122233', 'Av. Central 123', 'Santa Cruz', -17.78530000, -63.18410000, ST_MakePoint(-63.18410000, -17.78530000)::geography, 100),
  ('c7777777-7777-7777-a777-777777777777', 'MiniMarket El Sol', 'Maria Rojas', '+59144455566', 'Calle Sol 45', 'Santa Cruz', -17.78600000, -63.18300000, ST_MakePoint(-63.18300000, -17.78600000)::geography, 80),
  ('c8888888-8888-8888-a888-888888888888', 'Tienda La Esquina', 'Jorge Villa', '+59177788899', 'Av. Esquina 99', 'Santa Cruz', -17.78700000, -63.18200000, ST_MakePoint(-63.18200000, -17.78700000)::geography, 80),
  ('c9999999-9999-9999-a999-999999999999', 'Supermercado Fidalga', 'Gerencia', '+59100011122', 'Av. Fidalga 1', 'Santa Cruz', -17.78400000, -63.18500000, ST_MakePoint(-63.18500000, -17.78400000)::geography, 200),
  ('c0000000-0000-0000-a000-000000000000', 'Pulperia Don Pepe', 'Pepe Garcia', '+59199988877', 'Calle Pepe 2', 'Santa Cruz', -17.78800000, -63.18100000, ST_MakePoint(-63.18100000, -17.78800000)::geography, 50)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar 5 visitas para Juan Pérez
INSERT INTO visits (id, user_id, client_id, status, visit_lat, visit_lng, visit_location, distance_to_client, notes, started_at, completed_at, created_at)
VALUES
  ('b6666666-6666-6666-a666-666666666666', 'a3333333-3333-4333-a333-333333333333', 'c6666666-6666-6666-a666-666666666666', 'visitado', -17.78530000, -63.18410000, ST_MakePoint(-63.18410000, -17.78530000)::geography, 0, 'Revisión de anaqueles', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 45 minutes', NOW() - INTERVAL '4 hours'),
  ('b7777777-7777-7777-a777-777777777777', 'a3333333-3333-4333-a333-333333333333', 'c7777777-7777-7777-a777-777777777777', 'visitado', -17.78600000, -63.18300000, ST_MakePoint(-63.18300000, -17.78600000)::geography, 0, 'Reposición de fideos', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 45 minutes', NOW() - INTERVAL '3 hours'),
  ('b8888888-8888-8888-a888-888888888888', 'a3333333-3333-4333-a333-333333333333', 'c8888888-8888-8888-a888-888888888888', 'fallido', -17.78700000, -63.18200000, ST_MakePoint(-63.18200000, -17.78700000)::geography, 0, 'Tienda cerrada', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes', NOW() - INTERVAL '2 hours'),
  ('b9999999-9999-9999-a999-999999999999', 'a3333333-3333-4333-a333-333333333333', 'c9999999-9999-9999-a999-999999999999', 'visitado', -17.78400000, -63.18500000, ST_MakePoint(-63.18500000, -17.78400000)::geography, 0, 'Acomodo de exhibidor', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '1 hour'),
  ('b0000000-0000-0000-a000-000000000000', 'a3333333-3333-4333-a333-333333333333', 'c0000000-0000-0000-a000-000000000000', 'en_ruta', -17.78800000, -63.18100000, ST_MakePoint(-63.18100000, -17.78800000)::geography, 500, 'Dirigiéndome al cliente', NOW() - INTERVAL '15 minutes', NULL, NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar 2 evidencias para cada visita nueva, con un poco de probabilidad de coordenadas alteradas
INSERT INTO evidence (visit_id, type, file_url, file_name, lat, lng, captured_at)
SELECT 
  id as visit_id,
  'foto'::evidence_type as type,
  (ARRAY[
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800'
  ])[floor(random() * 4 + 1)] as file_url,
  'evidencia_nueva_' || floor(random() * 1000) || '.jpg' as file_name,
  CASE WHEN random() > 0.5 THEN visit_lat ELSE visit_lat + 0.001 END as lat,
  CASE WHEN random() > 0.5 THEN visit_lng ELSE visit_lng + 0.001 END as lng,
  created_at as captured_at
FROM visits
WHERE id IN ('b6666666-6666-6666-a666-666666666666', 'b7777777-7777-7777-a777-777777777777', 'b8888888-8888-8888-a888-888888888888', 'b9999999-9999-9999-a999-999999999999', 'b0000000-0000-0000-a000-000000000000');

INSERT INTO evidence (visit_id, type, file_url, file_name, lat, lng, captured_at)
SELECT 
  id as visit_id,
  'foto'::evidence_type as type,
  (ARRAY[
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800'
  ])[floor(random() * 4 + 1)] as file_url,
  'evidencia_nueva_2_' || floor(random() * 1000) || '.jpg' as file_name,
  CASE WHEN random() > 0.5 THEN visit_lat ELSE visit_lat + 0.001 END as lat,
  CASE WHEN random() > 0.5 THEN visit_lng ELSE visit_lng + 0.001 END as lng,
  created_at as captured_at
FROM visits
WHERE id IN ('b6666666-6666-6666-a666-666666666666', 'b7777777-7777-7777-a777-777777777777', 'b8888888-8888-8888-a888-888888888888', 'b9999999-9999-9999-a999-999999999999', 'b0000000-0000-0000-a000-000000000000');
