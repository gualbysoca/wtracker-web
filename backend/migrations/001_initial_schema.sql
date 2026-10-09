-- =====================================================
-- Migration: 001_initial_schema
-- Description: Schema inicial de Workforce Tracker
-- Created: 2026-09-30
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- Datos geoespaciales

-- =====================================================
-- ENUM: Roles de usuario
-- =====================================================
CREATE TYPE user_role AS ENUM (
  'admin',
  'supervisor',
  'reponedor',
  'vendedor',
  'cobrador'
);

-- =====================================================
-- ENUM: Estados de visita
-- =====================================================
CREATE TYPE visit_status AS ENUM (
  'en_ruta',
  'visitado',
  'fallido'
);

-- =====================================================
-- ENUM: Tipos de evidencia
-- =====================================================
CREATE TYPE evidence_type AS ENUM (
  'foto',
  'firma_digital'
);

-- =====================================================
-- TABLA: users
-- =====================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'reponedor',
  phone         VARCHAR(30),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- TABLA: refresh_tokens (control de sesiones)
-- =====================================================
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- =====================================================
-- TABLA: clients (Directorio Master)
-- =====================================================
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name   VARCHAR(200) NOT NULL,
  contact_name    VARCHAR(120),
  phone           VARCHAR(30),
  email           VARCHAR(255),
  address         TEXT,
  lat             DECIMAL(10, 8),    -- Latitud GPS
  lng             DECIMAL(11, 8),    -- Longitud GPS
  location        GEOGRAPHY(POINT, 4326), -- PostGIS geoespacial
  geofence_radius INTEGER DEFAULT 100,   -- Radio de geovalla en metros
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_location ON clients USING GIST(location);
CREATE INDEX idx_clients_business_name ON clients(business_name);

-- =====================================================
-- TABLA: visits
-- =====================================================
CREATE TABLE visits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  status          visit_status NOT NULL DEFAULT 'en_ruta',
  visit_lat       DECIMAL(10, 8),  -- Coordenadas del momento de visita
  visit_lng       DECIMAL(11, 8),
  visit_location  GEOGRAPHY(POINT, 4326),
  distance_to_client INTEGER,     -- Distancia al cliente en metros
  notes           TEXT,
  started_at      TIMESTAMPTZ,    -- Cuando marcó "en_ruta"
  completed_at    TIMESTAMPTZ,    -- Cuando marcó "visitado" o "fallido"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visits_user_id ON visits(user_id);
CREATE INDEX idx_visits_client_id ON visits(client_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_created_at ON visits(created_at);

-- =====================================================
-- TABLA: evidence (Fotografías y firmas digitales)
-- =====================================================
CREATE TABLE evidence (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id      UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  type          evidence_type NOT NULL,
  file_url      TEXT NOT NULL,         -- URL del archivo almacenado
  file_name     VARCHAR(255),
  file_size     INTEGER,               -- Tamaño en bytes
  mime_type     VARCHAR(100),
  lat           DECIMAL(10, 8),        -- Coordenadas de la captura
  lng           DECIMAL(11, 8),
  captured_at   TIMESTAMPTZ NOT NULL,  -- Timestamp de la captura (validado)
  metadata      JSONB,                 -- Metadatos adicionales (EXIF, etc.)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_visit_id ON evidence(visit_id);
CREATE INDEX idx_evidence_type ON evidence(type);

-- =====================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers de updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATOS INICIALES: Usuario administrador por defecto
-- Password: Admin@1234 (bcrypt hash - cambiar en producción)
-- =====================================================
INSERT INTO users (full_name, email, password_hash, role)
VALUES (
  'Administrador del Sistema',
  'admin@wtracker.com',
  '$2b$12$H3zDznf.jXvPAgMewm582OXrywBSt8p0Hj30BPdPtlCSpmqj/8W3q',
  'admin'
);
