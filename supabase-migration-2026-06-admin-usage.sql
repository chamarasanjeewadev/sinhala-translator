-- SinhalaScribe — Admin backoffice, transcription modes & Gemini usage tracking
-- Run this in your Supabase SQL Editor (idempotent — safe to run twice).
-- Backward compatible with deployed code: new columns are defaulted,
-- new tables are unused until the corresponding app code ships.

-- 1. Admin flag on profiles (gates the backoffice login)
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Promote your own account after running this migration:
-- update public.profiles set is_admin = true where email = 'chamara.sanjeewa@gmail.com';

-- 2. Transcription mode flags
alter table public.transcriptions
  add column if not exists has_timestamps boolean not null default false,
  add column if not exists is_conversation boolean not null default false;

-- 3. Gemini usage log (written by the service role from /api/transcribe/chunk)
create table if not exists public.gemini_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  model text not null,
  chunk_index integer,
  total_chunks integer,
  audio_seconds numeric,
  prompt_tokens integer,
  output_tokens integer,
  total_tokens integer,
  created_at timestamptz not null default now()
);

alter table public.gemini_usage enable row level security;

-- No anon/authenticated write policies: only the service role (which bypasses
-- RLS) inserts rows. Admins may read directly when authenticated.
do $$ begin
  create policy "Admins can read usage"
    on public.gemini_usage for select
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin
      )
    );
exception when duplicate_object then null; end $$;

create index if not exists idx_gemini_usage_created_at
  on public.gemini_usage (created_at desc);
create index if not exists idx_gemini_usage_user_id
  on public.gemini_usage (user_id);

-- 4. Email campaigns (backoffice bulk email via Brevo; cursor-based resume
--    so a campaign larger than the daily send cap can continue next day)
create table if not exists public.email_campaigns (
  id uuid default gen_random_uuid() primary key,
  subject text not null,
  html_body text not null,
  status text not null default 'draft'
    check (status in ('draft', 'sending', 'paused', 'completed', 'failed')),
  -- only profiles created before this moment are recipients
  snapshot_at timestamptz not null default now(),
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  -- resume position: profiles ordered by (created_at, id)
  cursor_created_at timestamptz,
  cursor_id uuid,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Service-role access only (no policies on purpose).
alter table public.email_campaigns enable row level security;

-- 5. Daily usage rollup for the backoffice cost dashboard
create or replace view public.admin_gemini_usage_daily
with (security_invoker = true) as
select
  date_trunc('day', created_at) as day,
  model,
  count(*) as calls,
  coalesce(sum(audio_seconds), 0) as audio_seconds,
  coalesce(sum(prompt_tokens), 0) as prompt_tokens,
  coalesce(sum(output_tokens), 0) as output_tokens,
  coalesce(sum(total_tokens), 0) as total_tokens
from public.gemini_usage
group by 1, 2;
