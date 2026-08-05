-- SinhalaScribe — Lock down credit RPCs (August 2026)
-- Run in the Supabase SQL Editor. Idempotent. Safe to re-run.
--
-- Postgres grants EXECUTE on functions to PUBLIC by default, so every
-- SECURITY DEFINER credit function was callable with the public/anon key via
-- PostgREST (POST /rest/v1/rpc/<fn>). The credit-GRANTING functions being
-- reachable this way is the real exposure.
--
-- Restrict each function to the role that actually calls it:
--   * grant-type  -> service_role only. Stripe/RevenueCat webhooks, the admin
--                    platform, and the promo route all call these through the
--                    service-role (admin) client, never the browser.
--   * deduct-type -> authenticated (+ service_role). Called from API routes
--                    with the signed-in user's JWT (role = authenticated).
--
-- Owner (definer) execution is unaffected by revoking PUBLIC/anon, so internal
-- calls such as add_credits_stripe -> add_credits keep working.

do $$
declare
  fn record;
  service_only  text[] := array['add_credits', 'add_credits_stripe', 'admin_grant_credits', 'redeem_promo_code'];
  user_callable text[] := array['deduct_credit', 'deduct_n_credits', 'deduct_credits_typed'];
  sig text;
  processed int := 0;
begin
  for fn in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(service_only || user_callable)
  loop
    -- Identity arguments give the exact signature (handles overloads safely).
    sig := format('public.%I(%s)', fn.proname, fn.args);

    execute format('revoke execute on function %s from public', sig);
    execute format('revoke execute on function %s from anon', sig);

    if fn.proname = any(service_only) then
      execute format('revoke execute on function %s from authenticated', sig);
      execute format('grant execute on function %s to service_role', sig);
      raise notice 'service_role-only: %', sig;
    else
      execute format('grant execute on function %s to authenticated, service_role', sig);
      raise notice 'authenticated+service_role: %', sig;
    end if;

    processed := processed + 1;
  end loop;

  raise notice '=== processed % function(s) ===', processed;
  if processed = 0 then
    raise warning 'No matching functions found in schema public — nothing was locked down!';
  end if;
end $$;

-- ── Verification ──────────────────────────────────────────────────────────
-- This result grid is your proof. Expected:
--   add_credits, add_credits_stripe, admin_grant_credits, redeem_promo_code
--       -> service_role   (NO anon, NO authenticated, NO "PUBLIC ... OPEN")
--   deduct_credit, deduct_n_credits, deduct_credits_typed
--       -> authenticated, service_role
-- A NULL proacl shows as "⚠ PUBLIC (default — STILL OPEN)" = not locked.
-- Uses a correlated subquery (not GROUP BY) because proacl is aclitem[], which
-- Postgres cannot group by.
select
  p.proname as function,
  case
    when p.proacl is null
      then '⚠ PUBLIC (default — STILL OPEN to anon)'
    else coalesce(
      (
        select string_agg(distinct a.grantee::regrole::text, ', ')
        from aclexplode(p.proacl) a
        where a.privilege_type = 'EXECUTE'
      ),
      '(owner only)')
  end as execute_grantees
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'add_credits', 'add_credits_stripe', 'admin_grant_credits', 'redeem_promo_code',
    'deduct_credit', 'deduct_n_credits', 'deduct_credits_typed'
  )
order by p.proname;
