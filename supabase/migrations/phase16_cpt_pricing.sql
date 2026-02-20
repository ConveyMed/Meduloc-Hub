-- Phase 16: CPT Pricing Model Changes
-- surgeon_cpt_data: junction table for multiple CPT codes per surgeon
-- cpt_prices: one average price per CPT code
-- Universal dossier access: all authenticated users can view any surgeon

-- =============================================================================
-- 1. surgeon_cpt_data table
-- =============================================================================
CREATE TABLE IF NOT EXISTS surgeon_cpt_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  cpt_code TEXT NOT NULL,
  cpt_description TEXT,
  annual_volume INTEGER,
  site_of_care TEXT,
  last_refreshed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(surgeon_id, cpt_code)
);

CREATE INDEX idx_surgeon_cpt_surgeon ON surgeon_cpt_data(surgeon_id);
CREATE INDEX idx_surgeon_cpt_code ON surgeon_cpt_data(cpt_code);

ALTER TABLE surgeon_cpt_data ENABLE ROW LEVEL SECURITY;

-- RLS: all authenticated can SELECT, admin gets ALL
CREATE POLICY "surgeon_cpt_data_select" ON surgeon_cpt_data
  FOR SELECT USING (true);

CREATE POLICY "surgeon_cpt_data_admin" ON surgeon_cpt_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- Updated_at trigger
CREATE TRIGGER set_surgeon_cpt_data_updated_at
  BEFORE UPDATE ON surgeon_cpt_data
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- =============================================================================
-- 2. cpt_prices table
-- =============================================================================
CREATE TABLE IF NOT EXISTS cpt_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpt_code TEXT NOT NULL UNIQUE,
  cpt_description TEXT,
  average_price NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cpt_prices ENABLE ROW LEVEL SECURITY;

-- RLS: all authenticated can SELECT, admin gets ALL
CREATE POLICY "cpt_prices_select" ON cpt_prices
  FOR SELECT USING (true);

CREATE POLICY "cpt_prices_admin" ON cpt_prices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- Updated_at trigger
CREATE TRIGGER set_cpt_prices_updated_at
  BEFORE UPDATE ON cpt_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- =============================================================================
-- 3. Universal dossier access -- all authenticated users can view any surgeon
-- =============================================================================
DROP POLICY IF EXISTS "surgeons_select" ON surgeons;
CREATE POLICY "surgeons_select" ON surgeons
  FOR SELECT USING (true);

-- Also open up related dossier tables for universal read
DROP POLICY IF EXISTS "physician_profiles_select" ON physician_profiles;
CREATE POLICY "physician_profiles_select" ON physician_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "call_logs_select" ON call_logs;
CREATE POLICY "call_logs_select" ON call_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "custom_field_values_select" ON custom_field_values;
CREATE POLICY "custom_field_values_select" ON custom_field_values
  FOR SELECT USING (true);
