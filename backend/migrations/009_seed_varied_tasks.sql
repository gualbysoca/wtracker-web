-- 009_seed_varied_tasks.sql
-- Inserción de tareas variadas para probar filtros (empleados distintos, fechas distintas, estados distintos, clientes repetidos)

INSERT INTO visits (id, user_id, client_id, status, visit_lat, visit_lng, visit_location, distance_to_client, notes, started_at, completed_at, created_at)
VALUES
  -- Ana López en Supermercado Central Norte (Repetido, distinto empleado) - Visitado ayer
  (gen_random_uuid(), 'a2222222-2222-4222-a222-222222222222', 'c1111111-1111-4111-a111-111111111111', 'visitado', -17.78330000, -63.18210000, ST_MakePoint(-63.18210000, -17.78330000)::geography, 8, 'Revisión de inventario exitosa', NOW() - INTERVAL '1 day 2 hours', NOW() - INTERVAL '1 day 1 hour', NOW() - INTERVAL '1 day 2 hours'),
  
  -- Juan Pérez en Supermercado Central Norte (Repetido, distinto empleado) - Fallido la semana pasada
  (gen_random_uuid(), 'a3333333-3333-4333-a333-333333333333', 'c1111111-1111-4111-a111-111111111111', 'fallido', -17.78330000, -63.18210000, ST_MakePoint(-63.18210000, -17.78330000)::geography, 15, 'Administrador ausente', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
  
  -- Carlos Muñoz en Farmacia Popular - Visitado hace 3 días
  (gen_random_uuid(), 'a1111111-1111-4111-a111-111111111111', 'c3333333-3333-4333-a333-333333333333', 'visitado', -17.38950000, -66.15680000, ST_MakePoint(-66.15680000, -17.38950000)::geography, 5, 'Entrega completada', NOW() - INTERVAL '3 days 4 hours', NOW() - INTERVAL '3 days 3 hours', NOW() - INTERVAL '3 days 4 hours'),
  
  -- Ana López en Minimarket La Esquina - Fallido ayer
  (gen_random_uuid(), 'a2222222-2222-4222-a222-222222222222', 'c2222222-2222-4222-a222-222222222222', 'fallido', -16.48970000, -68.11930000, ST_MakePoint(-68.11930000, -16.48970000)::geography, 30, 'Sin presupuesto', NOW() - INTERVAL '1 day 6 hours', NOW() - INTERVAL '1 day 5 hours', NOW() - INTERVAL '1 day 6 hours'),
  
  -- Carlos Muñoz en Minimarket La Esquina (Repetido) - En ruta ahora mismo
  (gen_random_uuid(), 'a1111111-1111-4111-a111-111111111111', 'c2222222-2222-4222-a222-222222222222', 'en_ruta', -16.48970000, -68.11930000, ST_MakePoint(-68.11930000, -16.48970000)::geography, 250, 'En camino para segunda visita', NOW() - INTERVAL '10 minutes', NULL, NOW() - INTERVAL '10 minutes')
ON CONFLICT DO NOTHING;
