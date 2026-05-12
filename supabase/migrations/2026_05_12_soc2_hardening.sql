-- ============================================================
-- SOC 2 Security Hardening — applied 2026-05-12
-- Project: nhnpqsbmpypdxdvdqlfq (Meduloc Hub)
-- ============================================================
-- This migration captures live changes applied via Supabase MCP.
-- Source tables (analytics_tables.sql, user_devices.sql) have
-- been updated inline to keep fresh setups secure.
-- ============================================================

-- ---- DROP PERMISSIVE READ POLICIES ----
DROP POLICY IF EXISTS "Service role can read all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can read all screen views" ON public.screen_views;
DROP POLICY IF EXISTS "Service role can read all asset events" ON public.asset_events;
DROP POLICY IF EXISTS "Service role can read all AI queries" ON public.ai_queries;
DROP POLICY IF EXISTS "Service role can read all profile views" ON public.profile_views;
DROP POLICY IF EXISTS "Service role can read all directory searches" ON public.directory_searches;
DROP POLICY IF EXISTS "Service role can read all notification clicks" ON public.notification_clicks;
DROP POLICY IF EXISTS "Service role full access to owner profiles" ON public.owner_profiles;
DROP POLICY IF EXISTS "Authenticated can read devices for notifications" ON public.user_devices;
DROP POLICY IF EXISTS "Users can read player IDs for push" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Service role can read all preferences" ON public.user_notification_preferences;

-- ---- VIEWS: flip to security_invoker ----
ALTER VIEW IF EXISTS public.ai_unanswered_questions SET (security_invoker = true);
ALTER VIEW IF EXISTS public.ai_usage SET (security_invoker = true);
ALTER VIEW IF EXISTS public.asset_engagement SET (security_invoker = true);
ALTER VIEW IF EXISTS public.daily_active_users SET (security_invoker = true);
ALTER VIEW IF EXISTS public.screen_popularity SET (security_invoker = true);

-- ---- FUNCTIONS: pin search_path ----
ALTER FUNCTION public.calc_market_opportunity() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_comment_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_notification_preferences() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_post_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_field_intel_role(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_unread_notification_count(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_hierarchy_removal() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_field_intel_admin(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.surgeons_without_profiles(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION public.user_is_chat_member(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.visible_surgeon_ids(uuid) SET search_path = public, pg_temp;

-- ---- REVOKE EXECUTE on sensitive SECURITY DEFINER fns ----
-- Meduloc has explicit anon grants; revoke from both PUBLIC and anon.
REVOKE EXECUTE ON FUNCTION public.create_comment_notification() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_notification_preferences() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_post_notification() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_field_intel_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_notification_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_field_intel_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_is_chat_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.visible_surgeon_ids(uuid) FROM PUBLIC, anon;

-- ---- organization_code: admin-only updates ----
DROP POLICY IF EXISTS "Allow authenticated update of organization code" ON public.organization_code;

CREATE POLICY "admins_can_update_org_code"
  ON public.organization_code FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- ---- physician_profiles: field intel admin only for modifications ----
DROP POLICY IF EXISTS "profiles_upsert" ON public.physician_profiles;
DROP POLICY IF EXISTS "Users can view physician profiles" ON public.physician_profiles;
DROP POLICY IF EXISTS "physician_profiles_select" ON public.physician_profiles;

CREATE POLICY "admins_can_modify_physician_profiles"
  ON public.physician_profiles FOR ALL TO authenticated
  USING (public.is_field_intel_admin(auth.uid()))
  WITH CHECK (public.is_field_intel_admin(auth.uid()));

-- ---- STORAGE BUCKETS: remove broad listing policies ----
DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
