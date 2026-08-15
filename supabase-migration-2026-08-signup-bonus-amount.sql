-- ============================================================
-- 2026-08: Admin-adjustable free signup-credit AMOUNT
--
-- The free-tier ON/OFF switch already lives in app_settings
-- (signup_bonus_enabled, see supabase-migration-2026-08-signup-bonus-toggle.sql).
-- The grant amount, however, was hardcoded to 10 in handle_new_user(). This adds
-- a second admin-controlled setting (app_settings.signup_bonus_amount) so we can
-- A/B the welcome-bonus size (10 / 15 / 20 / 30 …) with no redeploy while we hunt
-- for the optimal free-tier amount.
--
-- Range is clamped to 1..50 in the trigger so a bad/blank/out-of-range value can
-- never grant garbage or blow up Gemini cost. Default stays 10.
--
-- Existing users are unaffected: handle_new_user() only fires for brand-new
-- auth.users rows.
-- ============================================================

-- 1. The amount. Seeded '10' (current value). ON CONFLICT DO NOTHING so a later
--    admin change survives a re-run of this migration.
insert into public.app_settings (key, value)
values ('signup_bonus_amount', '10')
on conflict (key) do nothing;

-- 2. Read the amount from app_settings instead of hardcoding it. Everything else
--    matches the 2026-08 signup-bonus-toggle version: the free tier is gated on
--    signup_bonus_enabled, claimed once per normalized inbox, and denied to
--    disposable domains. Only the grant line changes.
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
  v_amount   text;
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
      -- Admin-controlled amount, clamped defensively to 1..50 (default 10 for a
      -- blank/non-numeric/out-of-range value).
      select value into v_amount
      from public.app_settings
      where key = 'signup_bonus_amount';
      v_grant := case
        when v_amount ~ '^[0-9]+$' then least(50, greatest(1, v_amount::int))
        else 10
      end;
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
