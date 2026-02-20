-- Phase 7 & 8: Physician Profiles table + visible_surgeon_ids fix

-- 1. Create physician_profiles table
CREATE TABLE IF NOT EXISTS physician_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  summary TEXT,
  medical_school TEXT,
  residency TEXT,
  fellowship TEXT,
  research_interests TEXT,
  publications TEXT,
  healthgrades_score TEXT,
  news_pr TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT physician_profiles_surgeon_id_key UNIQUE (surgeon_id)
);

-- 2. RLS
ALTER TABLE physician_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view physician profiles"
  ON physician_profiles FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage physician profiles"
  ON physician_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- 3. Fix visible_surgeon_ids to use delegated_to (not user_id)
CREATE OR REPLACE FUNCTION visible_surgeon_ids(uid UUID)
RETURNS SETOF UUID AS $$
DECLARE
  user_role TEXT;
BEGIN
  IF is_field_intel_admin(uid) THEN
    RETURN QUERY SELECT id FROM surgeons;
    RETURN;
  END IF;

  SELECT role_tier INTO user_role FROM hierarchy_assignments WHERE user_id = uid LIMIT 1;

  IF user_role = 'vp' THEN
    RETURN QUERY
      SELECT sr.surgeon_id FROM surgeon_regions sr
      JOIN hierarchy_assignments ha ON ha.region_id = sr.region_id
      WHERE ha.user_id = uid AND ha.role_tier = 'vp';
  ELSIF user_role = 'manager' THEN
    RETURN QUERY
      SELECT ad.surgeon_id FROM account_delegations ad
      WHERE ad.delegated_to = uid
      UNION
      SELECT ad.surgeon_id FROM account_delegations ad
      JOIN hierarchy_assignments ha ON ha.user_id = ad.delegated_to AND ha.role_tier = 'rep'
      WHERE ha.parent_user_id = uid;
  ELSIF user_role = 'rep' THEN
    RETURN QUERY
      SELECT ad.surgeon_id FROM account_delegations ad WHERE ad.delegated_to = uid;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

