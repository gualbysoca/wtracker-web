-- Migración para añadir evidencias fotográficas reales a las tareas (visitas) existentes.
-- Se usan imágenes de anaqueles, supermercados y pasillos relacionados a la exhibición de productos (fideos).

INSERT INTO evidence (visit_id, type, file_url, file_name, lat, lng, captured_at)
SELECT 
  id as visit_id,
  'foto'::evidence_type as type,
  (ARRAY[
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800'
  ])[floor(random() * 5 + 1)] as file_url,
  'evidencia_anaquel_' || floor(random() * 1000) || '.jpg' as file_name,
  visit_lat as lat,
  visit_lng as lng,
  created_at as captured_at
FROM visits
WHERE id NOT IN (SELECT visit_id FROM evidence WHERE type = 'foto');
