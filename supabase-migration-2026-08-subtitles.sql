-- SinhalaScribe — Video Subtitles product (August 2026)
-- Run in the Supabase SQL Editor. Idempotent.
--
-- Adds the subtitle_projects table (video subtitle editor projects — the video
-- itself is NEVER uploaded; only segments/timing/style + video metadata are
-- stored) and a typed credit-deduction RPC used to bill subtitle generation at
-- SUBTITLE_CREDITS_PER_MINUTE (2/min vs 1/min for plain transcription).

-- 1. Allow the new 'subtitles' transaction type. The live constraint has been
--    widened over time (a prior manual ALTER added 'translation'; the 2026-08
--    admin migration added 'admin_grant'), so before running this in an
--    environment, confirm the live value set with:
--      SELECT pg_get_constraintdef(oid) FROM pg_constraint
--      WHERE conname = 'credit_transactions_type_check';
--    The replacement MUST keep every existing value or it fails validation
--    against rows already in the table.
alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in ('signup_bonus', 'purchase', 'transcription', 'translation', 'admin_grant', 'subtitles'));

-- 2. Subtitle projects. segments is the full subtitle track as
--    [{ "id": uuid-string, "start": seconds, "end": seconds, "text": "..." }];
--    style is the global SubtitleStyle object (null = client defaults).
--    video_filename/size/duration let the client sanity-check that the user
--    re-selected the same local file when resuming a project.
create table if not exists public.subtitle_projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  video_filename text not null,
  video_size_bytes bigint,
  video_duration_seconds integer not null,
  language text default 'si' not null,
  segments jsonb default '[]'::jsonb not null,
  style jsonb,
  credits_used integer default 0 not null,
  is_partial boolean default false not null,
  is_deleted boolean default false not null,
  deleted_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.subtitle_projects enable row level security;

do $$
begin
  create policy "Users can view own subtitle projects"
    on public.subtitle_projects for select
    using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can insert own subtitle projects"
    on public.subtitle_projects for insert
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can update own subtitle projects"
    on public.subtitle_projects for update
    using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can delete own subtitle projects"
    on public.subtitle_projects for delete
    using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_subtitle_projects_user_visible_created_at
  on public.subtitle_projects (user_id, created_at desc)
  where is_deleted = false;

-- 3. Typed credit deduction. A copy of deduct_n_credits that also takes the
--    ledger type — deliberately a NEW function rather than an overload of
--    deduct_n_credits (PostgREST overload resolution is fragile) and the
--    existing function is left untouched. p_type is restricted to spend-style
--    types so a compromised client can't write e.g. 'purchase' rows.
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
     or p_type not in ('transcription', 'translation', 'subtitles') then
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

grant execute on function public.deduct_credits_typed(uuid, integer, text, text) to authenticated;
