-- SinhalaScribe — Persistent Stripe customer id (July 2026)
-- Run this in your Supabase SQL Editor (idempotent — safe to run twice).
--
-- Why: checkout previously passed only customer_email, so Stripe created a
-- fresh guest Customer on every purchase. That makes the LAW26 promo's
-- "first-time transaction" restriction useless (every purchase looks like a
-- new customer) and hurts Radar's ability to recognise a returning buyer.
-- We now create one Stripe Customer per user and reuse it across checkouts;
-- this column stores that id. Written only by the service role from the
-- checkout route.

alter table public.profiles
  add column if not exists stripe_customer_id text;

-- One Supabase user maps to exactly one Stripe customer.
create unique index if not exists idx_profiles_stripe_customer_id
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
