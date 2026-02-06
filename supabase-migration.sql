-- Sinhala Translator SaaS — Supabase Migration
-- Run this in your Supabase SQL Editor

-- 1. Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  credits integer not null default 30,
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

-- 5. RPC: add_credits (idempotent via stripe_session_id)
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
  v_existing_tx uuid;
  v_current_credits integer;
  v_new_credits integer;
begin
  -- Idempotency check: skip if this stripe session was already processed
  select id into v_existing_tx
  from public.credit_transactions
  where stripe_session_id = p_stripe_session_id
  limit 1;

  if v_existing_tx is not null then
    select credits into v_current_credits
    from public.profiles
    where id = p_user_id;

    return jsonb_build_object(
      'success', true,
      'new_balance', coalesce(v_current_credits, 0),
      'error_message', null
    );
  end if;

  -- Lock and update
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

  update public.profiles
  set credits = v_new_credits, updated_at = now()
  where id = p_user_id;

  insert into public.credit_transactions (user_id, amount, type, stripe_session_id, balance_after, description)
  values (p_user_id, p_amount, 'purchase', p_stripe_session_id, v_new_credits, p_description);

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

create index idx_transcriptions_user_id on public.transcriptions(user_id);
create index idx_transcriptions_created_at on public.transcriptions(created_at desc);

-- ============================================================
-- Migration for existing databases (run if tables already exist)
-- ============================================================

-- Update handle_new_user to give 30 credits
-- (Already updated above in the CREATE OR REPLACE FUNCTION)

-- Add columns to transcriptions if they don't exist
-- ALTER TABLE public.transcriptions ADD COLUMN IF NOT EXISTS credits_used integer DEFAULT 0;
-- ALTER TABLE public.transcriptions ADD COLUMN IF NOT EXISTS is_partial boolean DEFAULT false;

-- Update profiles default
-- ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 30;
