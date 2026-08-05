-- SinhalaScribe — Admin-granted free credits (August 2026)
-- Run in the Supabase SQL Editor. Idempotent.
--
-- Adds an admin-only way to grant free credits to a user from the admin platform.
-- Grants are recorded in credit_transactions with a dedicated type = 'admin_grant'
-- so they stay auditable and do NOT count as revenue (the stats dashboard sums
-- credit_transactions where type = 'purchase' only — free grants must not inflate it).

-- 1. Allow the new transaction type. The base migration created this as an inline
--    column check, which Postgres auto-names credit_transactions_type_check. A
--    prior manual ALTER (see supabase-migration.sql notes) already widened the
--    live constraint to include 'translation' (written by deduct_n_credits), so
--    the replacement MUST keep every existing value or it fails validation
--    against rows already in the table.
alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in ('signup_bonus', 'purchase', 'transcription', 'translation', 'admin_grant'));

-- 2. Atomic admin grant. Mirrors public.add_credits' row-lock pattern, but writes
--    type = 'admin_grant' and needs no idempotency key: the unique index on
--    stripe_session_id is partial (where stripe_session_id is not null), so leaving
--    it null lets every grant insert and allows repeat grants to the same user.
create or replace function public.admin_grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text default 'Admin-granted credits'
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_current_credits integer;
  v_new_credits integer;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object(
      'success', false,
      'new_balance', 0,
      'error_message', 'Amount must be positive'
    );
  end if;

  -- Lock the profile row so concurrent grants for this user serialize here.
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

  v_new_credits := v_current_credits + p_amount;

  insert into public.credit_transactions (
    user_id, amount, type, stripe_session_id, balance_after, description
  )
  values (
    p_user_id, p_amount, 'admin_grant', null, v_new_credits, p_description
  );

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
