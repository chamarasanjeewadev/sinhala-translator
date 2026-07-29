-- 2026-07 Download gate: mark who may copy/download the FULL transcript.
--
-- Conversion lever: free-signup users who never paid can transcribe + preview,
-- but must buy credits (or redeem a promo) to extract the full transcript.
-- Both cash purchases (Stripe / Apple IAP) and DB promo redemptions log a
-- credit_transactions row with type = 'purchase' (see add_credits_stripe,
-- add_credits, redeem_promo_code), so a single flag captures the chosen rule:
-- "cash purchasers + promo redeemers unlock; signup-bonus-only users are gated".
--
-- Maintained by a trigger on credit_transactions so no payment RPC/webhook has
-- to change. Idempotent; safe to re-run.

alter table public.profiles
  add column if not exists has_purchased boolean not null default false;

-- Backfill: anyone who has ever had a purchase-type transaction.
update public.profiles p
set has_purchased = true
where has_purchased = false
  and exists (
    select 1 from public.credit_transactions t
    where t.user_id = p.id and t.type = 'purchase'
  );

-- Maintain going forward: any purchase-type transaction unlocks downloads.
create or replace function public.mark_has_purchased()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.type = 'purchase' then
    update public.profiles
    set has_purchased = true
    where id = new.user_id and has_purchased = false;
  end if;
  return new;
end;
$$;

drop trigger if exists on_purchase_mark_profile on public.credit_transactions;
create trigger on_purchase_mark_profile
  after insert on public.credit_transactions
  for each row execute function public.mark_has_purchased();
