-- ============================================================
-- Meduloc Hub: round 5. In-app Delete Account, and developer posts hidden.
-- Project: nhnpqsbmpypdxdvdqlfq. Authored 10.21.2026.
-- ============================================================
-- 1. The Delete Account screen (LegalSupport.js) calls rpc delete_user_account,
--    which never existed, so every delete failed. Apple requires it to work.
--    The function deletes the caller's own auth.users row and nothing else.
--    Everything hanging off the user goes through the foreign keys:
--    public.users cascades from auth.users, and the user's own posts, comments,
--    likes, reads, devices, prefs and analytics cascade from there.
-- 2. Six foreign keys would have blocked or failed that delete. They now keep
--    other people's rows and only lose the pointer to the deleted user:
--      * no ON DELETE (blocks the delete): leads.approved_by,
--        chat_members.added_by, organization_code.updated_by,
--        app_settings.updated_by -> ON DELETE SET NULL
--      * ON DELETE SET NULL on a NOT NULL column (fails the delete):
--        call_logs.user_id, leads.submitted_by -> drop NOT NULL. Call logs are
--        readable by the whole team, so they stay as team history.
--    Chat messages already use SET NULL on a nullable sender_id, so other
--    people's conversations survive.
-- 3. The developer account stays undeletable: private.guard_developer_account
--    refuses the cascaded public.users delete. The function checks first so the
--    caller gets a clear message.
-- 4. posts gets the same RESTRICTIVE "Hide app developer rows" policy that
--    post_comments, post_likes and activity_notifications already have, so a
--    developer's posts never show as "Unknown" to clients. Developers still
--    see them.
--
-- Changes to existing rows: none. Constraint swaps only.
-- ============================================================

set local lock_timeout = '5s';

-- ------------------------------------------------------------
-- 1. Foreign keys that would block a user delete
-- ------------------------------------------------------------
alter table public.leads drop constraint leads_approved_by_fkey;
alter table public.leads
  add constraint leads_approved_by_fkey foreign key (approved_by)
  references public.users(id) on delete set null;

alter table public.chat_members drop constraint chat_members_added_by_fkey;
alter table public.chat_members
  add constraint chat_members_added_by_fkey foreign key (added_by)
  references public.users(id) on delete set null;

alter table public.organization_code drop constraint organization_code_updated_by_fkey;
alter table public.organization_code
  add constraint organization_code_updated_by_fkey foreign key (updated_by)
  references auth.users(id) on delete set null;

alter table public.app_settings drop constraint app_settings_updated_by_fkey;
alter table public.app_settings
  add constraint app_settings_updated_by_fkey foreign key (updated_by)
  references auth.users(id) on delete set null;

alter table public.call_logs alter column user_id drop not null;
alter table public.leads alter column submitted_by drop not null;

-- ------------------------------------------------------------
-- 2. Delete Account. Callable by a signed-in user only, acts on auth.uid().
-- ------------------------------------------------------------
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if exists (select 1 from public.users u where u.id = caller and u.is_developer) then
    raise exception 'The app developer account cannot be deleted'
      using errcode = '42501';
  end if;

  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_user_account() from public, anon, authenticated;
grant execute on function public.delete_user_account() to authenticated;

-- ------------------------------------------------------------
-- 3. Developer posts hidden from everyone but developers.
--    Same shape as the other "Hide app developer rows" policies.
-- ------------------------------------------------------------
drop policy if exists "Hide app developer rows" on public.posts;
create policy "Hide app developer rows" on public.posts
  as restrictive for select to public
  using (
    user_id is null
    or user_id = (select auth.uid())
    or not (user_id = any (coalesce((select private.developer_user_ids()), '{}'::uuid[])))
    or (select auth.uid()) = any (coalesce((select private.developer_user_ids()), '{}'::uuid[]))
  );
