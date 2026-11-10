-- HelaVoice — Sinhala text to speech (November 2026)
-- Idempotent. Safe to re-run.
--
-- 1. tts_generations: usage log AND free-allowance ledger (each account gets a
--    lifetime free character allowance; free_chars records how much of a
--    request it covered). Service-role only — RLS on, deliberately no policies.
-- 2. Allow the 'text_to_speech' ledger type. Live constraint checked 2026-11-10:
--    signup_bonus, purchase, transcription, translation, admin_grant, subtitles.
--    The replacement MUST keep every existing value.
-- 3. deduct_credits_typed: same body as the live function, plus 'text_to_speech'.
--    CREATE OR REPLACE keeps the existing grants (authenticated + service_role).

create table if not exists public.tts_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chars integer not null,
  free_chars integer not null default 0,
  credits integer not null default 0,
  audio_seconds numeric(8, 2),
  model text,
  voice text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tts_generations_user_id
  on public.tts_generations (user_id);

alter table public.tts_generations enable row level security;

alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in ('signup_bonus', 'purchase', 'transcription', 'translation', 'admin_grant', 'subtitles', 'text_to_speech'));

create or replace function public.deduct_credits_typed(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text default null
)
returns table (success boolean, credits_remaining integer)
language plpgsql security definer set search_path = ''
as $$
declare
  v_current integer;
  v_new integer;
begin
  if p_amount is null or p_amount <= 0
     or p_type not in ('transcription', 'translation', 'subtitles', 'text_to_speech') then
    return query select false, 0; return;
  end if;
  select credits into v_current from public.profiles where id = p_user_id for update;
  if v_current is null or v_current < p_amount then
    return query select false, coalesce(v_current, 0); return;
  end if;
  v_new := v_current - p_amount;
  update public.profiles set credits = v_new, updated_at = now() where id = p_user_id;
  insert into public.credit_transactions (user_id, amount, type, balance_after, description)
    values (p_user_id, -p_amount, p_type, v_new, p_description);
  return query select true, v_new;
end;
$$;
