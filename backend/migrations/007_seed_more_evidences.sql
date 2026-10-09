-- Migración para añadir una segunda evidencia a cada visita existente.
-- Se introducen intencionalmente algunas coordenadas erróneas (desfasadas > 50 metros)
-- para poder visualizar el estado "Inválido" en el FrontEnd.

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
  -- Si el aleatorio es mayor a 0.5, alteramos las coordenadas añadiendo 0.001 grados (~111 metros)
  -- Esto forzará a que el cálculo de Haversine arroje > 50m y se marque como inválido.
  CASE WHEN random() > 0.5 THEN visit_lat + 0.001 ELSE visit_lat END as lat,
  CASE WHEN random() > 0.5 THEN visit_lng + 0.001 ELSE visit_lng END as lng,
  created_at + interval '2 minutes' as captured_at
FROM visits;
