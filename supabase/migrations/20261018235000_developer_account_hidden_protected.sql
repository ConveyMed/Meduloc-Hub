-- ============================================================
-- Meduloc Hub: hidden, undeletable App Developer account
-- Project: nhnpqsbmpypdxdvdqlfq. Authored 10.18.2026.
-- ============================================================
-- Chase tests every Velator app as chase@appcatalyst.org. Client admins kept
-- deleting his test accounts, and his testing sent them notifications. A row
-- with users.is_developer = true is:
--   * undeletable: a BEFORE DELETE trigger refuses it, so an auth.users delete
--     (which cascades here through users_id_fkey) fails as a whole too;
--   * locked: only postgres, supabase_admin or service_role may set or clear
--     is_developer, or remove is_admin / is_owner from a developer row;
--   * hidden: RESTRICTIVE select policies hide the developer's user row and the
--     rows they generate (analytics, RSVPs, likes, comments, reports,
--     announcements) from everyone but the developer;
--   * silent: their activity feed rows are never written, and their
--     announcements are left out of everyone else's unread count.
-- Edge functions (send-push-notification, support-contact) skip
-- developer-sent pushes in code.
--
-- Same design as FieldOrtho. Additive except the last statement, which marks
-- Chase's row and no other.
-- ============================================================

set local lock_timeout = '5s';

-- ------------------------------------------------------------
-- 1. The flag
-- ------------------------------------------------------------
alter table public.users
  add column if not exists is_developer boolean not null default false;

-- ------------------------------------------------------------
-- 2. Helpers in a schema PostgREST does not expose, so none of this is
--    callable as /rest/v1/rpc/<name>.
-- ------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Policy helper: must stay plpgsql (an sql body gets inlined into the policy
-- and runs as the caller, where the users policy hides the developer row).
create or replace function private.developer_user_ids()
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return coalesce(
    (select array_agg(u.id) from public.users u where u.is_developer),
    '{}'::uuid[]
  );
end;
$$;
revoke all on function private.developer_user_ids() from public, anon, authenticated;
grant execute on function private.developer_user_ids() to anon, authenticated;

-- Guard trigger. SECURITY INVOKER on purpose: inside a definer function
-- current_user is the owner (postgres), which would make every caller look
-- trusted. guard_user_privilege_columns stays as it is; this runs beside it.
create or replace function private.guard_developer_account()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  trusted boolean := current_user in ('postgres', 'supabase_admin', 'service_role');
begin
  if tg_op = 'DELETE' then
    if old.is_developer then
      raise exception 'The app developer account cannot be deleted'
        using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.is_developer and not trusted then
      raise exception 'Not authorized to modify is_developer' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.is_developer is distinct from old.is_developer and not trusted then
    raise exception 'Not authorized to modify is_developer' using errcode = '42501';
  end if;

  if old.is_developer and not trusted and (
       (coalesce(old.is_admin, false) and not coalesce(new.is_admin, false))
    or (coalesce(old.is_owner, false) and not coalesce(new.is_owner, false))
  ) then
    raise exception 'Not authorized to remove access from the app developer account'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
revoke all on function private.guard_developer_account() from public, anon, authenticated;

drop trigger if exists guard_developer_account on public.users;
create trigger guard_developer_account
  before insert or update or delete on public.users
  for each row execute function private.guard_developer_account();

-- Activity feed (the bell): drop rows whose actor is a developer. Covers the
-- post and comment triggers and the client insert path. Definer so it can
-- read users.
create or replace function private.skip_developer_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.actor_id is not null
     and exists (select 1 from public.users u where u.id = new.actor_id and u.is_developer) then
    return null;
  end if;
  return new;
end;
$$;
revoke all on function private.skip_developer_activity() from public, anon, authenticated;

drop trigger if exists skip_developer_activity on public.activity_notifications;
create trigger skip_developer_activity
  before insert on public.activity_notifications
  for each row execute function private.skip_developer_activity();

-- ------------------------------------------------------------
-- 3. Hidden: RESTRICTIVE select policies. They only ever remove rows, so no
--    existing permission widens. The developer still sees their own rows.
-- ------------------------------------------------------------
-- auth.uid() is called bare here, not as (select auth.uid()). The users UPDATE
-- and DELETE policies query users in a subquery; if this policy also held a
-- subquery, Postgres would refuse every users UPDATE and DELETE with 42P17
-- (infinite recursion). Proven in the dry run.
drop policy if exists "Hide app developer rows" on public.users;
create policy "Hide app developer rows" on public.users
  as restrictive for select to public
  using (not is_developer or id = auth.uid());

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('user_sessions',          'user_id'),
      ('screen_views',           'user_id'),
      ('ai_queries',             'user_id'),
      ('asset_events',           'user_id'),
      ('directory_searches',     'user_id'),
      ('notification_clicks',    'user_id'),
      ('user_notifications',     'user_id'),
      ('post_likes',             'user_id'),
      ('post_comments',          'user_id'),
      ('activity_notifications', 'actor_id'),
      ('notifications',          'created_by'),
      ('chat_reports',           'reported_by')
    ) as v(tbl, col)
  loop
    execute format('drop policy if exists "Hide app developer rows" on public.%I', t.tbl);
    execute format(
      'create policy "Hide app developer rows" on public.%I as restrictive for select to public
         using (%2$I is null or %2$I = (select auth.uid())
                or not (%2$I = any (coalesce((select private.developer_user_ids()), ''{}''::uuid[]))))',
      t.tbl, t.col);
  end loop;
end;
$$;

-- profile_views names two people: hide the row if either is a developer.
drop policy if exists "Hide app developer rows" on public.profile_views;
create policy "Hide app developer rows" on public.profile_views
  as restrictive for select to public
  using (
    viewer_id = (select auth.uid())
    or not (
      coalesce(viewer_id = any (coalesce((select private.developer_user_ids()), '{}'::uuid[])), false)
      or coalesce(viewed_user_id = any (coalesce((select private.developer_user_ids()), '{}'::uuid[])), false)
    )
  );

-- ------------------------------------------------------------
-- 4. Unread badge: leave developer announcements out of everyone else's count.
--    Same signature, owner and settings as before.
-- ------------------------------------------------------------
create or replace function public.get_unread_notification_count(p_user_id uuid)
returns table(updates_count bigint, events_count bigint)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  return query
  select
    count(*) filter (where n.type = 'update') as updates_count,
    count(*) filter (where n.type = 'event') as events_count
  from notifications n
  left join user_notifications un on un.notification_id = n.id and un.user_id = p_user_id
  where n.is_active = true
    and (un.is_read is null or un.is_read = false)
    and (un.is_archived is null or un.is_archived = false)
    and (n.created_by is null
         or n.created_by = p_user_id
         or not (n.created_by = any (private.developer_user_ids())));
end;
$function$;

-- ------------------------------------------------------------
-- 5. Mark Chase's account. Runs as postgres, so both guards allow it.
--    is_admin, is_owner and profile_complete are already true; only
--    is_developer and title change, on this one row.
-- ------------------------------------------------------------
update public.users
set is_developer = true,
    title = 'App Developer'
where id = '2da14155-0f1f-4f2a-bed7-9c1e4ebb3a22'
  and lower(email) = 'chase@appcatalyst.org';
