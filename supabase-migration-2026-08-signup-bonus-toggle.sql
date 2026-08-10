-- ============================================================
-- 2026-08: Global free-tier toggle (temporary abuse mitigation)
--
-- Free signup credits were being abused by mass sign-ups. This adds a single
-- admin-controlled switch (app_settings.signup_bonus_enabled) that gates the
-- welcome-bonus grant. Seeded OFF here, so applying this migration disables the
-- free tier immediately. Flip it back on from the admin Settings page (or SQL)
-- with no redeploy.
--
-- Existing users are unaffected: handle_new_user() only fires for brand-new
-- auth.users rows, so nobody's current balance changes.
-- ============================================================

-- 1. The switch. Seeded 'false' (free tier off). ON CONFLICT DO NOTHING so a
--    later admin change survives a re-run of this migration.
insert into public.app_settings (key, value)
values ('signup_bonus_enabled', 'false')
on conflict (key) do nothing;

-- 2. Gate the welcome bonus on the switch. When disabled, new accounts start at
--    0 credits and we deliberately DO NOT claim the signup_grants row, so the
--    inbox keeps its one-bonus-per-inbox eligibility for whenever the tier is
--    re-enabled. Everything else matches the 2026-07 free-tier-abuse version.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_norm     text;
  v_first    boolean;
  v_grant    integer := 0;
  v_setting  text;
  v_enabled  boolean;
begin
  v_norm := public.normalize_email(new.email);

  -- Global free-tier switch. Default ON when the row is missing/unreadable so a
  -- settings blip never silently denies legit users.
  select lower(coalesce(value, '')) into v_setting
  from public.app_settings
  where key = 'signup_bonus_enabled';
  v_enabled := coalesce(v_setting not in ('false', '0', 'no', 'off'), true);

  if v_enabled then
    -- Claim the free tier for this inbox. FOUND is true only when THIS insert
    -- won the row (i.e. the first alias of the inbox to sign up).
    insert into public.signup_grants (normalized_email, first_user_id)
    values (v_norm, new.id)
    on conflict (normalized_email) do nothing;
    v_first := FOUND;

    if v_first and not public.is_disposable_email(new.email) then
      v_grant := 10;  -- reduced from 30 (July 2026) to curb free-tier Gemini cost
    else
      v_grant := 0;
    end if;
  else
    v_grant := 0;  -- free tier disabled: new users start at 0 and must purchase
  end if;

  insert into public.profiles (id, email, full_name, credits, normalized_email)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    v_grant,
    v_norm
  );

  if v_grant > 0 then
    insert into public.credit_transactions (user_id, amount, type, balance_after, description)
    values (new.id, v_grant, 'signup_bonus', v_grant, 'Welcome bonus credits');
  end if;

  return new;
end;
$$;

-- Trigger already exists (on_auth_user_created); CREATE OR REPLACE above is enough.
