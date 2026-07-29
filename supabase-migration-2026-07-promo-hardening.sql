-- SinhalaScribe — Promo hardening + DB-driven promo codes (July 2026)
-- Run this in your Supabase SQL Editor. Idempotent — safe to run more than once.
--
-- Applies exactly what's missing on the live DB:
--   1. profiles.stripe_customer_id column (enables Stripe first-time-customer promo)
--   2. Idempotency race fix: dedupe + UNIQUE index + race-safe add_credits()
--   3. DB-driven promo codes: promo_codes + promo_redemptions + redeem_promo_code()
--
-- Order matters: the dedupe (STEP 2a) must run before the UNIQUE index (2b).

-- ============================================================
-- 1. profiles.stripe_customer_id
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ============================================================
-- 2. Idempotency race fix for credit_transactions.stripe_session_id
-- ============================================================

-- 2a. Dedupe: the UNIQUE index in 2b fails if the old race left duplicates.
-- Keeps the earliest row per session key, drops later copies. (Does not claw
-- back already-granted credits — that's a separate business decision.)
DELETE FROM public.credit_transactions a
USING public.credit_transactions b
WHERE a.stripe_session_id IS NOT NULL
  AND a.stripe_session_id = b.stripe_session_id
  AND a.created_at > b.created_at;

-- 2b. Make stripe_session_id a true idempotency key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_session_id
  ON public.credit_transactions (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- 2c. Race-safe add_credits: the INSERT is the atomic idempotency gate, so
-- concurrent duplicates conflict and no-op instead of double-crediting.
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_stripe_session_id text,
  p_description text DEFAULT 'Credit purchase'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_current_credits integer;
  v_new_credits integer;
  v_rows integer;
BEGIN
  SELECT credits INTO v_current_credits
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF v_current_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'new_balance', 0,
      'error_message', 'User profile not found');
  END IF;

  INSERT INTO public.credit_transactions (
    user_id, amount, type, stripe_session_id, balance_after, description
  )
  VALUES (
    p_user_id, p_amount, 'purchase', p_stripe_session_id,
    v_current_credits + p_amount, p_description
  )
  ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL
  DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('success', true, 'new_balance', v_current_credits,
      'error_message', null);
  END IF;

  v_new_credits := v_current_credits + p_amount;

  UPDATE public.profiles
  SET credits = v_new_credits, updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_credits,
    'error_message', null);
END;
$$;

-- ============================================================
-- 3. DB-driven promo codes + anti-abuse
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  code text PRIMARY KEY,
  credits integer NOT NULL CHECK (credits > 0),
  description text,
  max_redemptions integer,
  redeemed_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Seed the current codes. Adjust max_redemptions / expires_at to your campaign.
INSERT INTO public.promo_codes (code, credits, description, max_redemptions, expires_at)
VALUES
  ('HELA5FREE', 60, 'Promo code: HELA5FREE (60 credits)', NULL, NULL),
  ('LAW26',     60, 'Promo code: LAW26 (60 credits)',     500,  '2026-12-31 23:59:59+00')
ON CONFLICT (code) DO NOTHING;

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

  SELECT credits INTO v_current FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid',
      'error_message', 'User profile not found.');
  END IF;

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
