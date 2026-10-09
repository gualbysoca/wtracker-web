-- =====================================================
-- Migration: 010_create_user_locations
-- Description: Tracking in real-time
-- =====================================================

CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  accuracy DECIMAL(8, 2),
  is_mock_location BOOLEAN DEFAULT FALSE,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_captured_at ON user_locations(captured_at DESC);
