-- =====================================================
-- Migration: 014_managed_postgres_app_role_security
-- Description: Permisos mínimos para el rol de la API (wtracker_app) en Supabase.
--   - El backend se conecta con wtracker_app (no con postgres).
--   - RLS activado en todas las tablas: anon/authenticated (API REST pública de Supabase)
--     no tienen políticas, por lo que no pueden leer ni escribir nada.
--   - Requisito previo (fuera de git, contiene la contraseña):
--       CREATE ROLE wtracker_app LOGIN PASSWORD '<secreto>';
--       ALTER ROLE wtracker_app SET search_path = public, extensions;
-- Created: 2026-10-12
-- =====================================================

GRANT USAGE ON SCHEMA public, extensions TO wtracker_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wtracker_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wtracker_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO wtracker_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wtracker_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO wtracker_app;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

DO $$
DECLARE
  app_table text;
BEGIN
  FOREACH app_table IN ARRAY ARRAY['users', 'refresh_tokens', 'clients', 'visits', 'evidence', 'user_locations', 'settings']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', app_table);
    EXECUTE format(
      'CREATE POLICY wtracker_app_full_access ON public.%I FOR ALL TO wtracker_app USING (true) WITH CHECK (true)',
      app_table
    );
  END LOOP;
END $$;
