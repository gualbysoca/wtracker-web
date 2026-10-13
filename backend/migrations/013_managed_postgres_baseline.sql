-- =====================================================
-- Migration: 013_managed_postgres_baseline
-- Description: Esquema completo para una BD gestionada nueva (Supabase/PRD en Cloudflare).
--   Generado a partir del esquema real de la BD local (pg_dump), ya que las migraciones
--   001-012 no incluyen columnas añadidas manualmente (users.last_location_*).
--   Solo esquema + datos base (admin inicial y settings); sin datos de prueba.
-- Created: 2026-10-12
-- =====================================================

-- En Supabase las extensiones viven en el schema "extensions"
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ── Tipos ───────────────────────────────────────────
CREATE TYPE public.evidence_type AS ENUM ('foto', 'firma_digital');
CREATE TYPE public.user_role AS ENUM ('admin', 'supervisor', 'reponedor', 'vendedor', 'cobrador', 'repartidor');
CREATE TYPE public.visit_status AS ENUM ('en_ruta', 'visitado', 'fallido');

-- ── Funciones ───────────────────────────────────────
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
  AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── Tablas ──────────────────────────────────────────
CREATE TABLE public.users (
  id                uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  full_name         varchar(120) NOT NULL,
  email             varchar(255) NOT NULL UNIQUE,
  password_hash     varchar(255) NOT NULL,
  role              public.user_role DEFAULT 'reponedor' NOT NULL,
  phone             varchar(30),
  is_active         boolean DEFAULT true NOT NULL,
  avatar_url        text,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL,
  last_location_lat double precision,
  last_location_lng double precision,
  last_location_at  timestamptz,
  is_deleted        boolean DEFAULT false NOT NULL,
  is_on_shift       boolean DEFAULT false NOT NULL
);

CREATE TABLE public.refresh_tokens (
  id         uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash varchar(255) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.clients (
  id              uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  business_name   varchar(200) NOT NULL,
  contact_name    varchar(120),
  phone           varchar(30),
  email           varchar(255),
  address         text,
  lat             numeric(10,8),
  lng             numeric(11,8),
  location        extensions.geography(Point,4326),
  geofence_radius integer DEFAULT 100,
  is_active       boolean DEFAULT true NOT NULL,
  notes           text,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,
  city            varchar(100)
);

CREATE TABLE public.visits (
  id                 uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  client_id          uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  status             public.visit_status DEFAULT 'en_ruta' NOT NULL,
  visit_lat          numeric(10,8),
  visit_lng          numeric(11,8),
  visit_location     extensions.geography(Point,4326),
  distance_to_client integer,
  notes              text,
  started_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz DEFAULT now() NOT NULL,
  updated_at         timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.evidence (
  id          uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  visit_id    uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  type        public.evidence_type NOT NULL,
  file_url    text NOT NULL,
  file_name   varchar(255),
  file_size   integer,
  mime_type   varchar(100),
  lat         numeric(10,8),
  lng         numeric(11,8),
  captured_at timestamptz NOT NULL,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.user_locations (
  id               uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lat              numeric(10,8) NOT NULL,
  lng              numeric(11,8) NOT NULL,
  location         extensions.geography(Point,4326),
  accuracy         numeric(8,2),
  is_mock_location boolean DEFAULT false,
  captured_at      timestamptz NOT NULL,
  created_at       timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.settings (
  key         varchar(50) PRIMARY KEY,
  value       jsonb NOT NULL,
  description text,
  updated_at  timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ── Índices ─────────────────────────────────────────
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_role ON public.users USING btree (role);
CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);
CREATE INDEX idx_clients_business_name ON public.clients USING btree (business_name);
CREATE INDEX idx_clients_location ON public.clients USING gist (location);
CREATE INDEX idx_visits_user_id ON public.visits USING btree (user_id);
CREATE INDEX idx_visits_client_id ON public.visits USING btree (client_id);
CREATE INDEX idx_visits_status ON public.visits USING btree (status);
CREATE INDEX idx_visits_created_at ON public.visits USING btree (created_at);
CREATE INDEX idx_evidence_visit_id ON public.evidence USING btree (visit_id);
CREATE INDEX idx_evidence_type ON public.evidence USING btree (type);
CREATE INDEX idx_user_locations_user_id ON public.user_locations USING btree (user_id);
CREATE INDEX idx_user_locations_captured_at ON public.user_locations USING btree (captured_at DESC);

-- ── Triggers ────────────────────────────────────────
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Datos base ──────────────────────────────────────
-- Password inicial: Admin@1234 (mismo hash que 001_initial_schema) — CAMBIAR tras el primer login.
INSERT INTO public.users (full_name, email, password_hash, role)
VALUES ('Administrador del Sistema', 'admin@wtracker.com',
        '$2b$12$H3zDznf.jXvPAgMewm582OXrywBSt8p0Hj30BPdPtlCSpmqj/8W3q', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.settings (key, value, description) VALUES
  ('geofence_radius', '100', 'Radio de tolerancia en metros para validar evidencias o tareas'),
  ('gamification_sniper', '10', 'Número mínimo de tareas sin fallos para premio Francotirador'),
  ('gamification_on_fire', '20', 'Número mínimo de tareas exitosas para premio Empleado en Llamas'),
  ('gamification_black_cloud', '5', 'Número mínimo de tareas fallidas para premio Nube Negra'),
  ('gamification_turtle', '60', 'Minutos de inactividad acumulada para premio Tortuga'),
  ('gamification_enabled', 'true', 'Activar o desactivar el motor de gamificación')
ON CONFLICT (key) DO NOTHING;
