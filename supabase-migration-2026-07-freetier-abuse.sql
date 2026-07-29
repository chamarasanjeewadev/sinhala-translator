-- Free-tier abuse hardening (July 2026)
-- Run this in your Supabase SQL Editor. Safe to re-run (idempotent).
--
-- Problem: handle_new_user() granted 30 free credits on EVERY auth.users insert
-- with no email normalization. One person could farm the free tier endlessly with
-- Gmail dot/+tag aliases (u.s.e.r@ / user+1@) or disposable inboxes.
--
-- Fix (soft): every signup still creates an account, but the 10-credit bonus
-- (reduced from 30 in July 2026 to curb free-tier Gemini cost) is only granted
-- to the FIRST alias of a given inbox and never to disposable domains.
-- Plus: an is_blocked flag admins can set to stop transcription and zero credits.
-- Mirrors the promo anti-abuse layer (normalize_email + one-grant-per-inbox).

-- ============================================================
-- 1. normalize_email(): SQL twin of src/lib/promo.ts normalizeEmail()
-- ============================================================
create or replace function public.normalize_email(raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(raw, '')));
  v_at    int;
  v_local text;
  v_domain text;
  v_plus  int;
begin
  v_at := position('@' in v_email);
  -- No usable '@' (also rejects leading '@' and trailing '@'): return as-is.
  if v_at <= 1 or v_at = length(v_email) then
    return v_email;
  end if;

  v_local  := substring(v_email from 1 for v_at - 1);
  v_domain := substring(v_email from v_at + 1);

  -- Drop +tag for every provider (name+promo@ -> name@).
  v_plus := position('+' in v_local);
  if v_plus > 0 then
    v_local := substring(v_local from 1 for v_plus - 1);
  end if;

  if v_domain = 'googlemail.com' then
    v_domain := 'gmail.com';
  end if;
  if v_domain = 'gmail.com' then
    v_local := replace(v_local, '.', '');
  end if;

  return v_local || '@' || v_domain;
end;
$$;

-- ============================================================
-- 2. Disposable-domain blocklist (edit via SQL, not code)
--    Seeded from DISPOSABLE_DOMAINS in hela-voice-web/src/lib/promo.ts.
-- ============================================================
create table if not exists public.disposable_email_domains (
  domain text primary key
);

insert into public.disposable_email_domains (domain) values
  ('mailinator.com'), ('guerrillamail.com'), ('guerrillamail.info'),
  ('sharklasers.com'), ('10minutemail.com'), ('10minutemail.net'),
  ('tempmail.com'), ('temp-mail.org'), ('tempmail.dev'), ('yopmail.com'),
  ('trashmail.com'), ('trashmail.de'), ('getnada.com'), ('nada.email'),
  ('dispostable.com'), ('maildrop.cc'), ('fakeinbox.com'),
  ('throwawaymail.com'), ('mohmal.com'), ('emailondeck.com'),
  ('mintemail.com'), ('moakt.com'), ('tempinbox.com'), ('spamgourmet.com'),
  ('mailnesia.com'), ('harakirimail.com'), ('discard.email'),
  ('getairmail.com'), ('inboxkitten.com')
on conflict (domain) do nothing;

create or replace function public.is_disposable_email(raw text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.disposable_email_domains d
    where d.domain = split_part(lower(btrim(coalesce(raw, ''))), '@', 2)
  );
$$;

-- ============================================================
-- 3. signup_grants: one free-tier bonus per normalized inbox.
--    The PRIMARY KEY is the hard one-bonus-per-inbox constraint.
-- ============================================================
create table if not exists public.signup_grants (
  normalized_email text primary key,
  first_user_id uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now()
);

alter table public.signup_grants enable row level security;
-- No policies: service-role / SECURITY DEFINER access only.

-- ============================================================
-- 4. profiles: normalized identity + blocking columns
-- ============================================================
alter table public.profiles
  add column if not exists normalized_email text,
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text;

create index if not exists idx_profiles_normalized_email
  on public.profiles (normalized_email);

-- ============================================================
-- 5. Rewrite handle_new_user(): withhold the bonus for duplicate
--    aliases and disposable domains (soft — account is always created).
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_norm   text;
  v_first  boolean;
  v_grant  integer;
begin
  v_norm := public.normalize_email(new.email);

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

-- ============================================================
-- 6. Gate credit spending on is_blocked (authoritative choke point
--    for both the web chunk flow and the mobile whole-file flow).
-- ============================================================
create or replace function public.deduct_credit(
  p_user_id uuid,
  p_description text default 'Transcription'
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_current_credits integer;
  v_blocked boolean;
  v_new_credits integer;
begin
  -- Lock the row for update
  select credits, is_blocked into v_current_credits, v_blocked
  from public.profiles
  where id = p_user_id
  for update;

  if v_current_credits is null then
    return jsonb_build_object(
      'success', false,
      'remaining_credits', 0,
      'error_message', 'User profile not found'
    );
  end if;

  if v_blocked then
    return jsonb_build_object(
      'success', false,
      'remaining_credits', 0,
      'error_message', 'Account blocked'
    );
  end if;

  if v_current_credits < 1 then
    return jsonb_build_object(
      'success', false,
      'remaining_credits', v_current_credits,
      'error_message', 'Insufficient credits. Please purchase more credits.'
    );
  end if;

  v_new_credits := v_current_credits - 1;

  update public.profiles
  set credits = v_new_credits, updated_at = now()
  where id = p_user_id;

  insert into public.credit_transactions (user_id, amount, type, balance_after, description)
  values (p_user_id, -1, 'transcription', v_new_credits, p_description);

  return jsonb_build_object(
    'success', true,
    'remaining_credits', v_new_credits,
    'error_message', null
  );
end;
$$;

create or replace function public.deduct_n_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text default 'Translation'
)
returns table (success boolean, credits_remaining integer)
language plpgsql security definer set search_path = ''
as $$
declare
  v_current integer;
  v_blocked boolean;
  v_new integer;
begin
  select credits, is_blocked into v_current, v_blocked
  from public.profiles where id = p_user_id for update;

  if v_blocked then
    return query select false, coalesce(v_current, 0); return;
  end if;

  if v_current is null or v_current < p_amount then
    return query select false, coalesce(v_current, 0); return;
  end if;

  v_new := v_current - p_amount;
  update public.profiles set credits = v_new, updated_at = now() where id = p_user_id;
  insert into public.credit_transactions (user_id, amount, type, balance_after, description)
    values (p_user_id, -p_amount, 'translation', v_new, p_description);
  return query select true, v_new;
end;
$$;

grant execute on function public.deduct_n_credits(uuid, integer, text) to authenticated;

-- ============================================================
-- 7. Backfill existing data (populate identity + seed grants so future
--    duplicate signups are caught). Existing credit balances are left
--    untouched — admins zero abusive balances individually via Block.
-- ============================================================
update public.profiles
set normalized_email = public.normalize_email(email)
where normalized_email is null;

-- Seed signup_grants from the EARLIEST account per normalized inbox, so the
-- first-signup rule is anchored to real history.
insert into public.signup_grants (normalized_email, first_user_id, granted_at)
select distinct on (p.normalized_email)
  p.normalized_email, p.id, p.created_at
from public.profiles p
where p.normalized_email is not null
order by p.normalized_email, p.created_at asc, p.id asc
on conflict (normalized_email) do nothing;
