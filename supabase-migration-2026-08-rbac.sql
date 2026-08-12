-- SinhalaScribe — Role-based access control for the backoffice (August 2026)
-- Run in the Supabase SQL Editor. Idempotent.
--
-- Splits the single boolean is_admin flag into three backoffice roles so
-- responsibilities can be divided:
--   superadmin — everything, including assigning/changing any user's role
--   admin      — all operational actions (grant credits, block, edit settings)
--   manager    — limited: view all pages + send warning emails, no destructive ops
-- Regular (non-backoffice) users have role = null.
--
-- Design: we ADD a nullable role enum column and keep the existing is_admin
-- column as a SYNCED MIRROR (is_admin = role is not null) via a trigger. This
-- means every existing is_admin check and RLS policy keeps working with no
-- change, while all three roles gain backoffice access.

-- 1. Role enum. Order encodes rank (manager < admin < superadmin) but the app
--    gates on explicit capability, not enum ordering.
do $$ begin
  create type public.backoffice_role as enum ('manager', 'admin', 'superadmin');
exception when duplicate_object then null; end $$;

-- 2. Role column on profiles. Null means "regular user" (no backoffice access).
alter table public.profiles
  add column if not exists role public.backoffice_role;

-- 3. Backfill: every current is_admin user becomes 'admin' (a safe default; the
--    superadmin is promoted explicitly in step 6). Only fill rows not set yet so
--    re-running is a no-op.
update public.profiles
  set role = 'admin'
  where is_admin = true and role is null;

-- 4. Keep is_admin a synced mirror of "has a backoffice role" so all existing
--    is_admin checks and RLS policies keep working untouched.
create or replace function public.sync_is_admin_from_role()
returns trigger
language plpgsql
as $$
begin
  new.is_admin := (new.role is not null);
  return new;
end;
$$;

-- Fire only when role is touched, so ordinary profile updates (credits, blocking)
-- never reset is_admin.
drop trigger if exists trg_sync_is_admin on public.profiles;
create trigger trg_sync_is_admin
  before insert or update of role on public.profiles
  for each row execute function public.sync_is_admin_from_role();

-- 5. One-time reconcile: align is_admin with role across all existing rows now
--    that the trigger exists (covers the backfill above).
update public.profiles set is_admin = (role is not null);

-- 6. Seed the superadmin.
update public.profiles set role = 'superadmin'
  where email = 'chamara.sanjeewa@gmail.com';

-- 7. Assign/clear a user's backoffice role. Only a superadmin may run this.
--    The admin app calls RPCs through the service-role client (no JWT), so
--    auth.uid() is null here — the caller id is passed explicitly as p_actor_id
--    and this function verifies THAT user is a superadmin. p_role of null / ''
--    / 'none' clears the role (demote to regular user). Returns
--    jsonb { success, role, error_message } (mirrors admin_grant_credits shape).
create or replace function public.set_user_role(
  p_actor_id uuid,
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_actor_role public.backoffice_role;
  v_new_role public.backoffice_role;
begin
  if p_actor_id is null then
    return jsonb_build_object('success', false, 'role', null,
      'error_message', 'Not authenticated');
  end if;

  -- Lock the actor row and verify they are a superadmin.
  select role into v_actor_role
  from public.profiles where id = p_actor_id for update;

  if v_actor_role is distinct from 'superadmin' then
    return jsonb_build_object('success', false, 'role', null,
      'error_message', 'Only a superadmin can change roles');
  end if;

  -- Validate / cast the target role. Empty / 'none' clears it.
  if p_role is null or p_role = '' or p_role = 'none' then
    v_new_role := null;
  else
    begin
      v_new_role := p_role::public.backoffice_role;
    exception when invalid_text_representation then
      return jsonb_build_object('success', false, 'role', null,
        'error_message', 'Invalid role');
    end;
  end if;

  -- Anti-lockout: a superadmin cannot strip/demote their own superadmin role
  -- (prevents locking the last superadmin out). They may promote others freely.
  if p_user_id = p_actor_id and v_new_role is distinct from 'superadmin' then
    return jsonb_build_object('success', false, 'role', null,
      'error_message', 'You cannot change your own superadmin role');
  end if;

  -- Lock + verify the target exists.
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    return jsonb_build_object('success', false, 'role', null,
      'error_message', 'User profile not found');
  end if;

  update public.profiles
    set role = v_new_role, updated_at = now()
    where id = p_user_id;  -- trg_sync_is_admin keeps is_admin in sync

  return jsonb_build_object('success', true,
    'role', v_new_role, 'error_message', null);
end;
$$;
