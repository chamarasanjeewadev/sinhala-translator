-- HelaVoice — credit RPC hardening on top of supabase-migration-2026-08-lock-credit-rpcs.sql (Nov 2026).
-- Idempotent. `create or replace` keeps each function's existing ACL and owner.

-- B1: deduct_n_credits — a NEGATIVE p_amount used to ADD credits (v_new = current - (-N)) and the
--     function stays executable by `authenticated`. Reject negative/NULL; 0 keeps its old no-op
--     behaviour. Body otherwise identical to the live function.
create or replace function public.deduct_n_credits(p_user_id uuid, p_amount integer, p_description text default 'Translation'::text)
 returns table(success boolean, credits_remaining integer)
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_current integer;
  v_blocked boolean;
  v_new integer;
begin
  if p_amount is null or p_amount < 0 then
    return query select false, 0; return;
  end if;

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
$function$;

-- B3: set_user_role — trusts a caller-supplied p_actor_id and was executable by anon. Only the admin
--     app calls it, via the service-role client (hela-voice-admin/src/lib/roles.ts).
revoke execute on function public.set_user_role(uuid, uuid, text) from public;
revoke execute on function public.set_user_role(uuid, uuid, text) from anon;
revoke execute on function public.set_user_role(uuid, uuid, text) from authenticated;
grant  execute on function public.set_user_role(uuid, uuid, text) to service_role;

-- ── Emergency rollback of set_user_role lock only (do not run unless the admin app breaks) ──
-- grant execute on function public.set_user_role(uuid, uuid, text) to anon, authenticated;
