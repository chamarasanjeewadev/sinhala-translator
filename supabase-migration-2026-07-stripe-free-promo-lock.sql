-- SinhalaScribe — Stop free ($0 / 100%-off) Stripe promo codes being farmed (July 2026)
-- Run in the Supabase SQL Editor. Idempotent.
--
-- Problem: a 100%-off Stripe promo code (e.g. LAW26) makes checkout $0. Stripe
-- can't enforce once-per-customer on a $0 checkout (no payment record), so a
-- user completes the free checkout repeatedly and the webhook grants pack
-- credits every time. Fix: the DB enforces one free-promo grant per
-- (user, promotion_code); repeat free checkouts complete in Stripe but grant no
-- credits. PAID discounted purchases are unaffected (the user pays each time).

-- One row per (user, promotion code) that got a FREE grant. PK makes it a hard
-- one-time-per-user gate for that code.
CREATE TABLE IF NOT EXISTS public.stripe_promo_grants (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  promotion_code text NOT NULL,
  session_id text NOT NULL,
  credits integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, promotion_code)
);

ALTER TABLE public.stripe_promo_grants ENABLE ROW LEVEL SECURITY;

-- Grants credits for a Stripe purchase, but if the checkout was FREE via a promo
-- code, only the first such checkout per (user, code) is credited. Retries of
-- the SAME session stay idempotent (add_credits is keyed on session id).
CREATE OR REPLACE FUNCTION public.add_credits_stripe(
  p_user_id uuid,
  p_amount integer,
  p_session_id text,
  p_description text,
  p_promotion_code text,   -- NULL when no promo code applied
  p_is_free boolean        -- true when amount_total = 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_existing_session text;
  v_credits jsonb;
BEGIN
  IF p_promotion_code IS NOT NULL AND p_is_free THEN
    INSERT INTO public.stripe_promo_grants (user_id, promotion_code, session_id, credits)
    VALUES (p_user_id, p_promotion_code, p_session_id, p_amount)
    ON CONFLICT (user_id, promotion_code) DO NOTHING;

    IF NOT FOUND THEN
      -- A free grant for this (user, code) already exists.
      SELECT session_id INTO v_existing_session
      FROM public.stripe_promo_grants
      WHERE user_id = p_user_id AND promotion_code = p_promotion_code;

      -- Different session => repeat farming attempt: complete without crediting.
      IF v_existing_session IS DISTINCT FROM p_session_id THEN
        RETURN jsonb_build_object('success', true, 'granted', false,
          'reason', 'free_promo_already_used');
      END IF;
      -- Same session retry: fall through; add_credits is idempotent on it.
    END IF;
  END IF;

  v_credits := public.add_credits(p_user_id, p_amount, p_session_id, p_description);
  RETURN jsonb_build_object('success', COALESCE((v_credits->>'success')::boolean, false),
    'granted', true, 'add_credits', v_credits);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_credits_stripe(uuid, integer, text, text, text, boolean) TO service_role;
