CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (key, value, description) VALUES
  ('geofence_radius', '100', 'Radio de tolerancia en metros para validar evidencias o tareas'),
  ('gamification_sniper', '10', 'Número mínimo de tareas sin fallos para premio Francotirador'),
  ('gamification_on_fire', '20', 'Número mínimo de tareas exitosas para premio Empleado en Llamas'),
  ('gamification_black_cloud', '5', 'Número mínimo de tareas fallidas para premio Nube Negra'),
  ('gamification_turtle', '60', 'Minutos de inactividad acumulada para premio Tortuga'),
  ('gamification_enabled', 'true', 'Activar o desactivar el motor de gamificación')
ON CONFLICT (key) DO NOTHING;
