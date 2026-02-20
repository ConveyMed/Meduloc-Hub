-- ============================================
-- PHASE 2: ROW-LEVEL SECURITY POLICIES
-- ============================================

-- Helper function: get a user's field intel role
CREATE OR REPLACE FUNCTION get_field_intel_role(uid UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role_tier FROM hierarchy_assignments WHERE user_id = uid LIMIT 1),
    CASE WHEN (SELECT is_admin FROM users WHERE id = uid) THEN 'admin' ELSE NULL END
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_field_intel_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM users WHERE id = uid), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get all surgeon IDs visible to a user
CREATE OR REPLACE FUNCTION visible_surgeon_ids(uid UUID)
RETURNS SETOF UUID AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Admin sees everything
  IF is_field_intel_admin(uid) THEN
    RETURN QUERY SELECT id FROM surgeons;
    RETURN;
  END IF;

  SELECT role_tier INTO user_role FROM hierarchy_assignments WHERE user_id = uid LIMIT 1;

  IF user_role = 'vp' THEN
    -- VP sees all accounts in their region(s)
    RETURN QUERY
      SELECT sr.surgeon_id FROM surgeon_regions sr
      JOIN hierarchy_assignments ha ON ha.region_id = sr.region_id
      WHERE ha.user_id = uid AND ha.role_tier = 'vp';
  ELSIF user_role = 'manager' THEN
    -- Manager sees accounts delegated to them + accounts delegated to their reps
    RETURN QUERY
      SELECT ad.surgeon_id FROM account_delegations ad
      WHERE ad.user_id = uid
      UNION
      SELECT ad.surgeon_id FROM account_delegations ad
      JOIN hierarchy_assignments ha ON ha.user_id = ad.user_id AND ha.role_tier = 'rep'
      WHERE ha.parent_user_id = uid;
  ELSIF user_role = 'rep' THEN
    -- Rep sees only accounts delegated to them
    RETURN QUERY
      SELECT ad.surgeon_id FROM account_delegations ad WHERE ad.user_id = uid;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- SURGEONS: users see only surgeons visible to their role
DROP POLICY IF EXISTS "surgeons_select" ON surgeons;
CREATE POLICY "surgeons_select" ON surgeons FOR SELECT
  USING (id IN (SELECT visible_surgeon_ids(auth.uid())));

DROP POLICY IF EXISTS "surgeons_admin_insert" ON surgeons;
CREATE POLICY "surgeons_admin_insert" ON surgeons FOR INSERT
  WITH CHECK (is_field_intel_admin(auth.uid()));

DROP POLICY IF EXISTS "surgeons_admin_update" ON surgeons;
CREATE POLICY "surgeons_admin_update" ON surgeons FOR UPDATE
  USING (is_field_intel_admin(auth.uid()));

DROP POLICY IF EXISTS "surgeons_admin_delete" ON surgeons;
CREATE POLICY "surgeons_admin_delete" ON surgeons FOR DELETE
  USING (is_field_intel_admin(auth.uid()));

-- REGIONS: all authenticated users can view, admin can modify
DROP POLICY IF EXISTS "regions_select" ON regions;
CREATE POLICY "regions_select" ON regions FOR SELECT USING (true);

DROP POLICY IF EXISTS "regions_admin_all" ON regions;
CREATE POLICY "regions_admin_all" ON regions FOR ALL
  USING (is_field_intel_admin(auth.uid()));

-- SURGEON_REGIONS: follow surgeon visibility
DROP POLICY IF EXISTS "surgeon_regions_select" ON surgeon_regions;
CREATE POLICY "surgeon_regions_select" ON surgeon_regions FOR SELECT
  USING (surgeon_id IN (SELECT visible_surgeon_ids(auth.uid())));

DROP POLICY IF EXISTS "surgeon_regions_admin" ON surgeon_regions;
CREATE POLICY "surgeon_regions_admin" ON surgeon_regions FOR ALL
  USING (is_field_intel_admin(auth.uid()));

-- HIERARCHY_ASSIGNMENTS: users see their own + admin sees all
DROP POLICY IF EXISTS "hierarchy_select" ON hierarchy_assignments;
CREATE POLICY "hierarchy_select" ON hierarchy_assignments FOR SELECT
  USING (user_id = auth.uid() OR parent_user_id = auth.uid() OR is_field_intel_admin(auth.uid()));

DROP POLICY IF EXISTS "hierarchy_admin" ON hierarchy_assignments;
CREATE POLICY "hierarchy_admin" ON hierarchy_assignments FOR ALL
  USING (is_field_intel_admin(auth.uid()));

-- ACCOUNT_DELEGATIONS: follow surgeon visibility
DROP POLICY IF EXISTS "delegations_select" ON account_delegations;
CREATE POLICY "delegations_select" ON account_delegations FOR SELECT
  USING (surgeon_id IN (SELECT visible_surgeon_ids(auth.uid())));

-- VP and manager can delegate (insert/delete) accounts they can see
DROP POLICY IF EXISTS "delegations_manage" ON account_delegations;
CREATE POLICY "delegations_manage" ON account_delegations FOR ALL
  USING (
    is_field_intel_admin(auth.uid())
    OR delegated_by = auth.uid()
    OR (SELECT role_tier FROM hierarchy_assignments WHERE user_id = auth.uid() LIMIT 1) IN ('vp', 'manager')
  );

-- CALL_LOGS: follow surgeon visibility, anyone can insert for their visible surgeons
DROP POLICY IF EXISTS "call_logs_select" ON call_logs;
CREATE POLICY "call_logs_select" ON call_logs FOR SELECT
  USING (surgeon_id IN (SELECT visible_surgeon_ids(auth.uid())));

DROP POLICY IF EXISTS "call_logs_insert" ON call_logs;
CREATE POLICY "call_logs_insert" ON call_logs FOR INSERT
  WITH CHECK (user_id = auth.uid() AND surgeon_id IN (SELECT visible_surgeon_ids(auth.uid())));

-- LEADS: submitter sees their own, admin sees all
DROP POLICY IF EXISTS "leads_select" ON leads;
CREATE POLICY "leads_select" ON leads FOR SELECT
  USING (submitted_by = auth.uid() OR is_field_intel_admin(auth.uid()));

DROP POLICY IF EXISTS "leads_insert" ON leads;
CREATE POLICY "leads_insert" ON leads FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "leads_admin_update" ON leads;
CREATE POLICY "leads_admin_update" ON leads FOR UPDATE
  USING (is_field_intel_admin(auth.uid()));

-- PHYSICIAN_PROFILES: follow surgeon visibility
DROP POLICY IF EXISTS "profiles_select" ON physician_profiles;
CREATE POLICY "profiles_select" ON physician_profiles FOR SELECT
  USING (surgeon_id IN (SELECT visible_surgeon_ids(auth.uid())));

DROP POLICY IF EXISTS "profiles_upsert" ON physician_profiles;
CREATE POLICY "profiles_upsert" ON physician_profiles FOR ALL
  USING (true); -- edge function runs as service role, but allow read for all visible

-- CUSTOM_FIELDS: everyone reads, admin modifies
DROP POLICY IF EXISTS "custom_fields_select" ON custom_fields;
CREATE POLICY "custom_fields_select" ON custom_fields FOR SELECT USING (true);

DROP POLICY IF EXISTS "custom_fields_admin" ON custom_fields;
CREATE POLICY "custom_fields_admin" ON custom_fields FOR ALL
  USING (is_field_intel_admin(auth.uid()));

-- CUSTOM_FIELD_VALUES: follow surgeon visibility
DROP POLICY IF EXISTS "cfv_select" ON custom_field_values;
CREATE POLICY "cfv_select" ON custom_field_values FOR SELECT
  USING (surgeon_id IN (SELECT visible_surgeon_ids(auth.uid())));

DROP POLICY IF EXISTS "cfv_admin" ON custom_field_values;
CREATE POLICY "cfv_admin" ON custom_field_values FOR ALL
  USING (is_field_intel_admin(auth.uid()));
