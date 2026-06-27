-- SinhalaScribe — Purchases ledger (June 2026)
-- Run this in your Supabase SQL Editor (idempotent — safe to run twice).
-- Backward compatible with deployed code: the table is unused until the
-- webhook changes ship.

-- 1. Purchases: one row per completed payment (Stripe checkout or Apple IAP
--    via RevenueCat). Written only by the service role from the webhook
--    handlers; the unique provider_transaction_id makes webhook retries a
--    no-op. credit_transactions stays the credits ledger — this table records
--    the money side for accounting.
create table if not exists public.purchases (
  id uuid default gen_random_uuid() primary key,
  -- auth.users + set null (not profiles + cascade): money records must
  -- survive account deletion.
  user_id uuid references auth.users(id) on delete set null,
  package_id text,            -- pack_10 / com.helavoice.app.credits.starter / null (backfill)
  package_name text,          -- Starter / Popular / Pro / Premium
  credits integer not null,
  amount_cents integer not null,  -- minor units, what the customer paid
  currency text not null default 'usd',
  provider text not null check (provider in ('stripe', 'apple_iap')),
  -- Stripe checkout session id, or 'rc_<event.id>' for RevenueCat — the same
  -- key add_credits already uses for idempotency.
  provider_transaction_id text not null unique,
  created_at timestamptz not null default now()
);

-- Service-role access only (no policies on purpose) — same posture as
-- email_campaigns.
alter table public.purchases enable row level security;

create index if not exists idx_purchases_created_at
  on public.purchases (created_at desc);
create index if not exists idx_purchases_user_id
  on public.purchases (user_id);

-- 2. Backfill from historical credit purchases. Old webhook code recorded
--    only credits, so the price is reconstructed from the package map:
--    60→$5, 300→$20, 700→$30, 1000→$50. Keys starting 'rc_' are Apple IAP.
insert into public.purchases
  (user_id, package_name, credits, amount_cents, currency, provider,
   provider_transaction_id, created_at)
select
  ct.user_id,
  case ct.amount when 60 then 'Starter' when 300 then 'Popular'
                 when 700 then 'Pro'    when 1000 then 'Premium' end,
  ct.amount,
  case ct.amount when 60 then 500  when 300 then 2000
                 when 700 then 3000 when 1000 then 5000 end,
  'usd',
  case when ct.stripe_session_id like 'rc\_%' escape '\'
       then 'apple_iap' else 'stripe' end,
  coalesce(ct.stripe_session_id, 'backfill_' || ct.id::text),
  ct.created_at
from public.credit_transactions ct
where ct.type = 'purchase'
  and ct.amount in (60, 300, 700, 1000)
on conflict (provider_transaction_id) do nothing;

-- Sanity check: must return 0. A nonzero count means purchase rows exist
-- whose credit amount matches no known package — map those by hand.
-- select count(*) from public.credit_transactions
--   where type = 'purchase' and amount not in (60, 300, 700, 1000);
