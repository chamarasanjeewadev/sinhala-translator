-- SinhalaScribe — Accurate Gemini cost tracking + runtime transcription settings
-- Run this in your Supabase SQL Editor (idempotent — safe to run twice).
--
-- Why:
--  1. Gemini 3 models emit *thinking* tokens billed at the output rate. We only
--     stored candidatesTokenCount, so the admin cost dashboard under-reported
--     vs Google AI Studio. Add a thoughts_tokens column (+ backfill history from
--     total-prompt-output) so cost estimates match AI Studio.
--  2. Let admins switch the transcription model + thinking level at runtime
--     (to experiment with accuracy vs cost) without a redeploy — via app_settings.

-- 1. Capture thinking tokens per call
alter table public.gemini_usage
  add column if not exists thoughts_tokens integer;

-- Backfill history: for a thinking model, total = prompt + output(candidates) +
-- thoughts, so the unrecorded thinking tokens are reconstructable. Only touch
-- rows that haven't been set yet.
update public.gemini_usage
set thoughts_tokens = greatest(
      coalesce(total_tokens, 0)
        - coalesce(prompt_tokens, 0)
        - coalesce(output_tokens, 0),
      0
    )
where thoughts_tokens is null;

-- 2. Daily rollup now also sums thinking tokens (appended column keeps
--    create-or-replace happy).
create or replace view public.admin_gemini_usage_daily
with (security_invoker = true) as
select
  date_trunc('day', created_at) as day,
  model,
  count(*) as calls,
  coalesce(sum(audio_seconds), 0) as audio_seconds,
  coalesce(sum(prompt_tokens), 0) as prompt_tokens,
  coalesce(sum(output_tokens), 0) as output_tokens,
  coalesce(sum(total_tokens), 0) as total_tokens,
  coalesce(sum(thoughts_tokens), 0) as thoughts_tokens
from public.gemini_usage
group by 1, 2;

-- 3. Runtime app settings (key/value). Read by the web transcription routes
--    (service role), written by admins from the backoffice.
create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_settings enable row level security;

-- Service role (web routes + admin writes) bypasses RLS. Authenticated admins
-- may read directly.
do $$ begin
  create policy "Admins can read settings"
    on public.app_settings for select
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin
      )
    );
exception when duplicate_object then null; end $$;

-- Seed the transcription controls. gemini_model mirrors the current production
-- model; thinking_level defaults to 'minimal' (cheapest — Gemini 3 defaults to
-- heavy thinking, which is billed and unnecessary for transcription).
insert into public.app_settings (key, value) values
  ('gemini_model', 'gemini-3-flash-preview'),
  ('thinking_level', 'minimal')
on conflict (key) do nothing;
