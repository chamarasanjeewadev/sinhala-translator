-- Sinhala Translator SaaS — Supabase Migration
-- Run this in your Supabase SQL Editor

-- 1. Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  credits integer not null default 30,
  -- Reused Stripe Customer id (one per user) so repeat purchases share a
  -- customer — required for the LAW26 first-time-transaction promo restriction
  -- and better Stripe Radar accuracy. Populated by the checkout route.
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Create credit_transactions table
create table public.credit_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('signup_bonus', 'purchase', 'transcription')),
  stripe_session_id text,
  balance_after integer not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.credit_transactions enable row level security;

create policy "Users can read own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- 3. Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    30
  );

  insert into public.credit_transactions (user_id, amount, type, balance_after, description)
  values (new.id, 30, 'signup_bonus', 30, 'Welcome bonus credits');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. RPC: deduct_credit (atomic)
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
  v_new_credits integer;
begin
  -- Lock the row for update
  select credits into v_current_credits
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

-- 5. RPC: add_credits (idempotent + race-safe via UNIQUE stripe_session_id)
--
-- Idempotency is enforced by the UNIQUE index on credit_transactions
-- (stripe_session_id) — see idx_credit_transactions_session_id below. A plain
-- "SELECT then INSERT" check is a TOCTOU race: two concurrent redemptions of the
-- same promo/session both read "not yet processed" and both credit. Instead we
-- let the INSERT itself be the atomic gate: only the first caller for a given
-- key wins the insert; duplicates hit ON CONFLICT DO NOTHING and are no-ops.
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_stripe_session_id text,
  p_description text default 'Credit purchase'
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_current_credits integer;
  v_new_credits integer;
  v_rows integer;
begin
  -- Lock the profile row first so concurrent calls for this user serialize here
  -- (prevents lost updates when two *different* sessions credit at once).
  select credits into v_current_credits
  from public.profiles
  where id = p_user_id
  for update;

  if v_current_credits is null then
    return jsonb_build_object(
      'success', false,
      'new_balance', 0,
      'error_message', 'User profile not found'
    );
  end if;

  -- Atomic idempotency gate. Only the first insert for this session key
  -- succeeds; concurrent duplicates conflict on the unique index and insert
  -- nothing, so they must NOT credit the account.
  insert into public.credit_transactions (
    user_id, amount, type, stripe_session_id, balance_after, description
  )
  values (
    p_user_id, p_amount, 'purchase', p_stripe_session_id,
    v_current_credits + p_amount, p_description
  )
  on conflict (stripe_session_id) where stripe_session_id is not null
  do nothing;

  get diagnostics v_rows = row_count;

  -- Already processed for this key: return current balance unchanged (no-op).
  if v_rows = 0 then
    return jsonb_build_object(
      'success', true,
      'new_balance', v_current_credits,
      'error_message', null
    );
  end if;

  v_new_credits := v_current_credits + p_amount;

  update public.profiles
  set credits = v_new_credits, updated_at = now()
  where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'new_balance', v_new_credits,
    'error_message', null
  );
end;
$$;

-- 6. Create transcriptions table
create table public.transcriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  transcription_text text not null,
  audio_duration_seconds integer,
  credits_used integer default 0,
  is_partial boolean default false,
  is_deleted boolean default false not null,
  deleted_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.transcriptions enable row level security;

create policy "Users can view own transcriptions"
  on public.transcriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transcriptions"
  on public.transcriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own transcriptions"
  on public.transcriptions for delete
  using (auth.uid() = user_id);

create policy "Users can update own transcriptions"
  on public.transcriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_transcriptions_user_id on public.transcriptions(user_id);
create index idx_transcriptions_created_at on public.transcriptions(created_at desc);
create index idx_transcriptions_user_visible_created_at
  on public.transcriptions(user_id, created_at desc)
  where is_deleted = false;

-- ============================================================
-- Migration for existing databases (run if tables already exist)
-- ============================================================

-- Update handle_new_user to give 30 credits
-- (Already updated above in the CREATE OR REPLACE FUNCTION)

-- Add columns to transcriptions if they don't exist
-- ALTER TABLE public.transcriptions ADD COLUMN IF NOT EXISTS credits_used integer DEFAULT 0;
-- ALTER TABLE public.transcriptions ADD COLUMN IF NOT EXISTS is_partial boolean DEFAULT false;
-- ALTER TABLE public.transcriptions ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL;
-- ALTER TABLE public.transcriptions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- CREATE INDEX IF NOT EXISTS idx_transcriptions_user_visible_created_at
--   ON public.transcriptions(user_id, created_at DESC)
--   WHERE is_deleted = false;

-- Update profiles default
-- ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 30;

-- ============================================================
-- Translation feature migration (March 2026)
-- ============================================================

-- Add English translation column
ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS english_translation TEXT NULL;

-- Update credit_transactions type check to include 'translation'
-- Find your constraint name first:
--   SELECT conname FROM pg_constraint
--     WHERE conrelid = 'public.credit_transactions'::regclass AND contype = 'c';
-- Then run (replace constraint name if different):
-- ALTER TABLE public.credit_transactions DROP CONSTRAINT credit_transactions_type_check;
-- ALTER TABLE public.credit_transactions
--   ADD CONSTRAINT credit_transactions_type_check
--   CHECK (type IN ('signup_bonus', 'purchase', 'transcription', 'translation'));

-- RPC: deduct N credits atomically (used for translation billing)
CREATE OR REPLACE FUNCTION public.deduct_n_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT 'Translation'
)
RETURNS TABLE (success boolean, credits_remaining integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_current integer;
  v_new integer;
BEGIN
  SELECT credits INTO v_current FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_current IS NULL OR v_current < p_amount THEN
    RETURN QUERY SELECT false, COALESCE(v_current, 0); RETURN;
  END IF;
  v_new := v_current - p_amount;
  UPDATE public.profiles SET credits = v_new, updated_at = now() WHERE id = p_user_id;
  INSERT INTO public.credit_transactions (user_id, amount, type, balance_after, description)
    VALUES (p_user_id, -p_amount, 'translation', v_new, p_description);
  RETURN QUERY SELECT true, v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_n_credits(uuid, integer, text) TO authenticated;

-- ============================================================
-- Feedback feature migration (April 2026)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transcription_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transcription_id uuid REFERENCES public.transcriptions(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text text NULL,
  would_recommend boolean NOT NULL,
  not_recommend_reason text NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, transcription_id)
);

ALTER TABLE public.transcription_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users can view own feedback"
    ON public.transcription_feedback FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own feedback"
    ON public.transcription_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update own feedback"
    ON public.transcription_feedback FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_transcription_feedback_user_id
  ON public.transcription_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_transcription_feedback_transcription_id
  ON public.transcription_feedback(transcription_id);

-- ============================================================
-- Soft delete transcriptions migration (May 2026)
-- ============================================================

ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.transcriptions
  SET is_deleted = false
  WHERE is_deleted IS NULL;

ALTER TABLE public.transcriptions
  ALTER COLUMN is_deleted SET DEFAULT false,
  ALTER COLUMN is_deleted SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transcriptions_user_visible_created_at
  ON public.transcriptions(user_id, created_at DESC)
  WHERE is_deleted = false;

-- ============================================================
-- Promo / purchase idempotency hardening (July 2026)
-- Fixes: a promo code (e.g. LAW26) or Stripe purchase could be credited
-- multiple times by firing concurrent requests. The old guard did
-- "SELECT then INSERT" with no unique constraint — a TOCTOU race. This makes
-- the stripe_session_id the atomic idempotency key at the DB level.
-- Run these steps IN ORDER in the Supabase SQL editor.
-- ============================================================

-- STEP 1 (inspect): list session keys that were already double-credited by the
-- race, so you know who over-earned before you lock things down. Review this
-- before changing anything.
--   SELECT stripe_session_id, count(*) AS times_credited, sum(amount) AS total_granted
--   FROM public.credit_transactions
--   WHERE stripe_session_id IS NOT NULL
--   GROUP BY stripe_session_id
--   HAVING count(*) > 1
--   ORDER BY count(*) DESC;

-- STEP 2 (optional balance reclaim — RUN BEFORE STEP 3, while dupes still exist):
-- subtract the over-granted credits from affected users. Each duplicate ledger
-- row (every copy past the earliest) represents credits that shouldn't have been
-- granted. DISTINCT a.id avoids over-counting keys that were credited 3+ times.
-- Never lets a balance drop below 0. Skip this if you'd rather let testers keep
-- the extra credits.
--   WITH dupes AS (
--     SELECT DISTINCT a.id, a.user_id, a.amount
--     FROM public.credit_transactions a
--     JOIN public.credit_transactions b
--       ON a.stripe_session_id = b.stripe_session_id
--      AND a.created_at > b.created_at          -- every row past the earliest
--     WHERE a.stripe_session_id IS NOT NULL
--   ),
--   reclaim AS (
--     SELECT user_id, sum(amount) AS amt FROM dupes GROUP BY user_id
--   )
--   UPDATE public.profiles p
--   SET credits = GREATEST(0, p.credits - r.amt)
--   FROM reclaim r WHERE r.user_id = p.id;

-- STEP 3 (dedupe): the UNIQUE index in STEP 4 will FAIL if duplicates exist.
-- Delete the extra transaction rows, keeping the earliest per key.
DELETE FROM public.credit_transactions a
USING public.credit_transactions b
WHERE a.stripe_session_id IS NOT NULL
  AND a.stripe_session_id = b.stripe_session_id
  AND a.created_at > b.created_at;   -- keep the earliest, drop later dupes

-- STEP 4 (enforce): unique index makes stripe_session_id a true idempotency key.
-- Partial (WHERE ... NOT NULL) so signup_bonus/transcription rows with NULL keys
-- are unaffected and can coexist.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_session_id
  ON public.credit_transactions (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- STEP 5 (function): re-run the CREATE OR REPLACE FUNCTION public.add_credits(...)
-- from section 5 near the top of this file so existing databases pick up the
-- race-safe ON CONFLICT version. (Fresh installs already have it.)

-- ============================================================
-- DB-driven promo codes + anti-abuse (July 2026)
-- Moves promo codes out of the hardcoded PROMO_CODES map in the API route into
-- a table with: a global redemption cap, an expiry date, an active flag, and a
-- ONE-redemption-per-normalized-email rule (defeats Gmail dot/+alias and
-- throwaway multi-account abuse — an account boundary alone doesn't).
-- All enforcement happens atomically inside redeem_promo_code() so concurrent
-- taps can't slip past the cap or the per-user limit.
-- ============================================================

-- Configurable promo codes. Edit rows here instead of redeploying the app.
CREATE TABLE IF NOT EXISTS public.promo_codes (
  code text PRIMARY KEY,                 -- stored UPPERCASE; route upper-cases input
  credits integer NOT NULL CHECK (credits > 0),
  description text,
  max_redemptions integer,               -- NULL = unlimited total redemptions
  redeemed_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,                -- NULL = never expires
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One successful redemption per (code, normalized email). The unique constraint
-- is what actually enforces "one per person" — normalized_email collapses
-- user+tag@ and u.s.e.r@gmail aliases to a single identity.
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL REFERENCES public.promo_codes(code) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  normalized_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, normalized_email)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_id
  ON public.promo_redemptions(user_id);

-- Lock down: service-role (API route via admin client) bypasses RLS; nobody
-- else can read/write. RLS on with no policies = deny by default.
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Seed the current codes. NOTE: adjust max_redemptions / expires_at to your
-- campaign — these are safe placeholders, not real limits.
INSERT INTO public.promo_codes (code, credits, description, max_redemptions, expires_at)
VALUES
  ('HELA5FREE', 60, 'Promo code: HELA5FREE (60 credits)', NULL, NULL),
  ('LAW26',     60, 'Promo code: LAW26 (60 credits)',     500,  '2026-12-31 23:59:59+00')
ON CONFLICT (code) DO NOTHING;

-- Atomic redemption: validates active/expiry/cap and one-per-email, credits the
-- user, writes the ledger row, and bumps the cap counter — all under a row lock
-- on the promo so concurrent redemptions serialize. Returns a jsonb result the
-- API route maps to HTTP status codes.
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_user_id uuid,
  p_normalized_email text,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_promo public.promo_codes%rowtype;
  v_current integer;
  v_new integer;
  v_rows integer;
  v_session text;
BEGIN
  -- Lock the promo row so the cap check + counter bump are atomic across
  -- concurrent redemptions of the same code.
  SELECT * INTO v_promo FROM public.promo_codes WHERE code = p_code FOR UPDATE;

  IF NOT FOUND OR NOT v_promo.active THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid',
      'error_message', 'Invalid promo code.');
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'expired',
      'error_message', 'This promo code has expired.');
  END IF;

  IF v_promo.max_redemptions IS NOT NULL
     AND v_promo.redeemed_count >= v_promo.max_redemptions THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'exhausted',
      'error_message', 'This promo code is no longer available.');
  END IF;

  -- Lock the profile before we mark the redemption (consistent promo->profile
  -- lock order avoids deadlocks with add_credits).
  SELECT credits INTO v_current FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid',
      'error_message', 'User profile not found.');
  END IF;

  -- One-per-email gate: only the first redemption for this identity inserts.
  INSERT INTO public.promo_redemptions (code, user_id, normalized_email)
  VALUES (p_code, p_user_id, p_normalized_email)
  ON CONFLICT (code, normalized_email) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'already_redeemed',
      'error_message', 'Promo code already redeemed.');
  END IF;

  v_new := v_current + v_promo.credits;
  v_session := 'promo_' || p_code || '_' || p_user_id::text;

  UPDATE public.profiles SET credits = v_new, updated_at = now() WHERE id = p_user_id;

  -- Ledger row; ON CONFLICT keeps it idempotent even if this key already exists
  -- from a pre-migration redemption.
  INSERT INTO public.credit_transactions (user_id, amount, type, stripe_session_id, balance_after, description)
  VALUES (p_user_id, v_promo.credits, 'purchase', v_session, v_new,
          COALESCE(v_promo.description, 'Promo code: ' || p_code))
  ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING;

  UPDATE public.promo_codes SET redeemed_count = redeemed_count + 1 WHERE code = p_code;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new,
    'error_code', null, 'error_message', null);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_promo_code(uuid, text, text) TO service_role;
