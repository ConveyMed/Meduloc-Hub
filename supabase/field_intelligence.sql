-- ============================================
-- PHASE 1: FIELD INTELLIGENCE DATABASE FOUNDATION
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Regions table
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- 2. Surgeons/accounts table (core data from CSV imports)
CREATE TABLE IF NOT EXISTS surgeons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Blue fields (from procedure database)
  full_name TEXT, -- some exports have one name field, not split
  first_name TEXT,
  last_name TEXT,
  npi TEXT,
  site_of_care TEXT,
  hospital TEXT,
  specialty TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT, -- stored as text to preserve leading zeros
  phone TEXT, -- raw digits, format for display
  email TEXT,
  fax TEXT,
  -- Procedure data
  cpt_code TEXT,
  cpt_description TEXT,
  annual_volume INTEGER,
  -- Yellow fields (market intelligence)
  device_price NUMERIC(10,2),
  market_opportunity NUMERIC(12,2), -- auto-calc: annual_volume * device_price
  competitor_products TEXT,
  contract_status TEXT, -- active, pending, not active
  buying_stage TEXT,
  forecast_close_date DATE,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surgeons_npi ON surgeons(npi);
CREATE INDEX IF NOT EXISTS idx_surgeons_last_name ON surgeons(last_name);
CREATE INDEX IF NOT EXISTS idx_surgeons_state ON surgeons(state);

ALTER TABLE surgeons ENABLE ROW LEVEL SECURITY;

-- 3. Surgeon-to-region mapping
CREATE TABLE IF NOT EXISTS surgeon_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(surgeon_id, region_id)
);

ALTER TABLE surgeon_regions ENABLE ROW LEVEL SECURITY;

-- 4. Hierarchy assignments (who reports to whom, who covers what region)
CREATE TABLE IF NOT EXISTS hierarchy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_tier TEXT NOT NULL CHECK (role_tier IN ('rep', 'manager', 'vp')),
  parent_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- manager for reps, VP for managers
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL, -- only for VPs
  label TEXT, -- custom display label (e.g., "Territory Manager" instead of "Rep")
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_user ON hierarchy_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_parent ON hierarchy_assignments(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_region ON hierarchy_assignments(region_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_role ON hierarchy_assignments(role_tier);

ALTER TABLE hierarchy_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Account delegations (which accounts are assigned to which user at each level)
CREATE TABLE IF NOT EXISTS account_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delegated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(surgeon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_delegations_surgeon ON account_delegations(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_delegations_user ON account_delegations(user_id);

ALTER TABLE account_delegations ENABLE ROW LEVEL SECURITY;

-- 6. Call logs (linked to accounts, not users - data persists when people leave)
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT,
  -- Snapshot of what changed during this call
  buying_stage_update TEXT,
  contract_status_update TEXT,
  forecast_close_date_update DATE,
  competitor_update TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_surgeon ON call_logs(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_date ON call_logs(call_date);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- 7. Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  city TEXT,
  state TEXT,
  specialty TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  surgeon_id UUID REFERENCES surgeons(id), -- linked after approval
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 8. Physician profiles (cached AI summaries)
CREATE TABLE IF NOT EXISTS physician_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE UNIQUE,
  summary TEXT, -- AI-generated profile summary
  medical_school TEXT,
  residency TEXT,
  fellowship TEXT,
  research_interests TEXT,
  publications TEXT,
  healthgrades_score TEXT,
  news_pr TEXT,
  source TEXT DEFAULT 'gemini', -- which AI generated this
  generated_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_physician_profiles_surgeon ON physician_profiles(surgeon_id);

ALTER TABLE physician_profiles ENABLE ROW LEVEL SECURITY;

-- 9. Custom fields (admin-defined per app)
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'dropdown', 'date', 'currency')),
  dropdown_options JSONB, -- for dropdown type: ["Option A", "Option B"]
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

-- 10. Custom field values (per surgeon per field)
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(surgeon_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_cfv_surgeon ON custom_field_values(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_cfv_field ON custom_field_values(field_id);

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

-- 11. Add field_intel_role to app_settings for show/hide toggle
INSERT INTO app_settings (key, value, description)
VALUES ('show_field_intel', '"true"', 'Show or hide Customer/Field Intel module')
ON CONFLICT (key) DO NOTHING;

-- 12. Market opportunity auto-calculation trigger
CREATE OR REPLACE FUNCTION calc_market_opportunity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.annual_volume IS NOT NULL AND NEW.device_price IS NOT NULL THEN
    NEW.market_opportunity := NEW.annual_volume * NEW.device_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calc_market_opportunity ON surgeons;
CREATE TRIGGER trigger_calc_market_opportunity
  BEFORE INSERT OR UPDATE OF annual_volume, device_price ON surgeons
  FOR EACH ROW
  EXECUTE FUNCTION calc_market_opportunity();

-- 13. Updated_at triggers
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_surgeons_updated ON surgeons;
CREATE TRIGGER trigger_surgeons_updated
  BEFORE UPDATE ON surgeons FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_regions_updated ON regions;
CREATE TRIGGER trigger_regions_updated
  BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_hierarchy_updated ON hierarchy_assignments;
CREATE TRIGGER trigger_hierarchy_updated
  BEFORE UPDATE ON hierarchy_assignments FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_leads_updated ON leads;
CREATE TRIGGER trigger_leads_updated
  BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_physician_profiles_updated ON physician_profiles;
CREATE TRIGGER trigger_physician_profiles_updated
  BEFORE UPDATE ON physician_profiles FOR EACH ROW EXECUTE FUNCTION update_timestamp();
