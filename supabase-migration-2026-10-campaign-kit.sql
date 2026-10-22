-- campaign-kit (email campaigns) for HelaVoice — 2026-10-22
-- Part 1: library schema, copied verbatim from campaign-kit migrations/001_campaign_kit.sql
-- Part 2: HelaVoice segment functions + campaign-assets bucket
-- Run once in the Supabase SQL editor. Safe to re-run (if not exists / or replace).

-- campaign-kit schema. Service-role only: RLS enabled, no policies.

create table if not exists ck_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subject text not null,
  preheader text,
  html text not null,
  text text not null,
  provider_template_id text,
  status text not null default 'draft'
    check (status in ('draft','ready','sending','paused','completed','cancelled')),
  audience_spec jsonb not null default '{"segments":[],"include":[],"exclude":[]}'::jsonb,
  auto_continue boolean not null default false,
  test_sent_at timestamptz,
  audience_built_at timestamptz,
  pause_reason text,
  safety_baseline jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ck_recipients (
  campaign_id uuid not null references ck_campaigns(id) on delete cascade,
  email text not null check (email = lower(btrim(email))),
  name text,
  recipient_id text,
  segment text not null,
  priority int not null default 0,
  status text not null default 'queued'
    check (status in ('queued','sending','sent','failed','skipped')),
  attempts int not null default 0,
  skip_reason text,
  provider_message_id text,
  sent_at timestamptz,
  last_error text,
  last_event text,
  last_event_at timestamptz,
  primary key (campaign_id, email)
);
create index if not exists ck_recipients_queue_idx on ck_recipients (campaign_id, status, priority);
create index if not exists ck_recipients_message_idx on ck_recipients (provider_message_id);

create table if not exists ck_suppressions (
  email text primary key check (email = lower(btrim(email))),
  reason text not null check (reason in ('unsubscribed','hard_bounce','spam','manual')),
  source_campaign_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists ck_daily_usage (
  day date primary key,
  sent int not null default 0
);

create table if not exists ck_events (
  id bigserial primary key,
  campaign_id uuid,
  email text not null,
  type text not null,
  provider_message_id text,
  dedupe_key text not null unique,
  payload jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists ck_events_campaign_idx on ck_events (campaign_id, type);

create table if not exists ck_locks (
  name text primary key,
  expires_at timestamptz not null
);

alter table ck_campaigns enable row level security;
alter table ck_recipients enable row level security;
alter table ck_suppressions enable row level security;
alter table ck_daily_usage enable row level security;
alter table ck_events enable row level security;
alter table ck_locks enable row level security;

-- p_paused_reasons null: any paused campaign is claimable; otherwise only paused ones whose
-- pause_reason is listed (empty array = ready only). Cron passes the auto-continue reasons so an
-- operator pause landing just before the claim is never overridden.
create or replace function ck_claim_campaign(p_id uuid, p_paused_reasons text[] default null)
returns setof ck_campaigns
language sql security definer set search_path = public as $$
  update ck_campaigns set status = 'sending', updated_at = now()
  where id = p_id
    and (status = 'ready'
      or (status = 'paused' and (p_paused_reasons is null or pause_reason = any(p_paused_reasons))))
  returning *;
$$;

-- Only a run that still owns the campaign (status 'sending') may release it, so a manual
-- pause/cancel made during the run is never overwritten.
create or replace function ck_release_campaign(p_id uuid, p_status text, p_reason text)
returns void
language sql security definer set search_path = public as $$
  update ck_campaigns set status = p_status, pause_reason = p_reason, updated_at = now()
  where id = p_id and status = 'sending';
$$;

create or replace function ck_take_batch(p_campaign uuid, p_limit int)
returns setof ck_recipients
language plpgsql security definer set search_path = public as $$
begin
  -- Rows are only handed out while the campaign is sending (a pause stops the next batch).
  if not exists (select 1 from ck_campaigns c where c.id = p_campaign and c.status = 'sending') then
    return;
  end if;

  update ck_recipients r set status = 'skipped', skip_reason = 'suppressed'
  where r.campaign_id = p_campaign and r.status = 'queued'
    and exists (select 1 from ck_suppressions s where s.email = r.email);

  return query
  with picked as (
    select r.campaign_id, r.email from ck_recipients r
    where r.campaign_id = p_campaign and r.status = 'queued'
    order by r.priority, r.email
    limit p_limit
    for update skip locked
  ), upd as (
    update ck_recipients r set status = 'sending', attempts = r.attempts + 1
    from picked p where r.campaign_id = p.campaign_id and r.email = p.email
    returning r.*
  )
  select * from upd order by priority, email;
end;
$$;

create or replace function ck_mark_result(
  p_campaign uuid, p_email text, p_status text, p_message_id text, p_error text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('sent','failed','queued','skipped') then
    raise exception 'ck_mark_result: invalid status %', p_status;
  end if;
  update ck_recipients set
    status = p_status,
    provider_message_id = case when p_status = 'sent' then p_message_id else provider_message_id end,
    sent_at = case when p_status = 'sent' then now() else sent_at end,
    last_error = case when p_status = 'failed' then p_error else last_error end,
    skip_reason = case when p_status = 'skipped' then p_error else skip_reason end
  where campaign_id = p_campaign and email = p_email;
end;
$$;

-- Batch form of ck_mark_result: p_results is a jsonb array of
-- {email, status, message_id, error}; one round trip per send group.
create or replace function ck_mark_results(p_campaign uuid, p_results jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_results, '[]'::jsonb)) as x(status text)
    where x.status is null or x.status not in ('sent','failed','queued','skipped')
  ) then
    raise exception 'ck_mark_results: invalid status';
  end if;
  update ck_recipients r set
    status = x.status,
    provider_message_id = case when x.status = 'sent' then x.message_id else r.provider_message_id end,
    sent_at = case when x.status = 'sent' then now() else r.sent_at end,
    last_error = case when x.status = 'failed' then x.error else r.last_error end,
    skip_reason = case when x.status = 'skipped' then x.error else r.skip_reason end
  from jsonb_to_recordset(coalesce(p_results, '[]'::jsonb))
    as x(email text, status text, message_id text, error text)
  where r.campaign_id = p_campaign and r.email = lower(btrim(x.email));
end;
$$;

-- Safety-stop inputs in one round trip: sent rows + this campaign's spam / hard_bounce events.
create or replace function ck_safety_counts(p_campaign uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'sent', (select count(*) from ck_recipients where campaign_id = p_campaign and status = 'sent'),
    'spam', (select count(*) from ck_events where campaign_id = p_campaign and type = 'spam'),
    'hardBounce', (select count(*) from ck_events where campaign_id = p_campaign and type = 'hard_bounce')
  );
$$;

create or replace function ck_add_usage(p_day date, p_n int)
returns int
language sql security definer set search_path = public as $$
  insert into ck_daily_usage (day, sent) values (p_day, p_n)
  on conflict (day) do update set sent = ck_daily_usage.sent + excluded.sent
  returning sent;
$$;

create or replace function ck_usage_days()
returns int
language sql security definer set search_path = public as $$
  select count(*)::int from ck_daily_usage where sent > 0;
$$;

create or replace function ck_acquire_lock(p_name text, p_ttl_seconds int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  insert into ck_locks (name, expires_at)
  values (p_name, now() + make_interval(secs => p_ttl_seconds))
  on conflict (name) do update set expires_at = excluded.expires_at
    where ck_locks.expires_at <= now();
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

create or replace function ck_release_lock(p_name text)
returns void
language sql security definer set search_path = public as $$
  delete from ck_locks where name = p_name;
$$;

create or replace function ck_skip_queued_not_in(p_campaign uuid, p_keep text[], p_reason text)
returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  update ck_recipients set status = 'skipped', skip_reason = p_reason
  where campaign_id = p_campaign and status = 'queued'
    and not (email = any (coalesce(p_keep, '{}'::text[])));
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function ck_cancel_queued(p_campaign uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  update ck_recipients set status = 'skipped', skip_reason = 'cancelled'
  where campaign_id = p_campaign and status = 'queued';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Operator retry: failed -> queued. Rows in 'sending' may have been delivered and stay manual.
create or replace function ck_requeue_failed(p_campaign uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  update ck_recipients set status = 'queued'
  where campaign_id = p_campaign and status = 'failed';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Lock down function execution: service-role only (PostgREST would otherwise expose these via anon).
revoke execute on function ck_claim_campaign(uuid, text[]) from public;
revoke execute on function ck_release_campaign(uuid, text, text) from public;
revoke execute on function ck_take_batch(uuid, int) from public;
revoke execute on function ck_mark_result(uuid, text, text, text, text) from public;
revoke execute on function ck_mark_results(uuid, jsonb) from public;
revoke execute on function ck_safety_counts(uuid) from public;
revoke execute on function ck_add_usage(date, int) from public;
revoke execute on function ck_usage_days() from public;
revoke execute on function ck_acquire_lock(text, int) from public;
revoke execute on function ck_release_lock(text) from public;
revoke execute on function ck_skip_queued_not_in(uuid, text[], text) from public;
revoke execute on function ck_cancel_queued(uuid) from public;
revoke execute on function ck_requeue_failed(uuid) from public;

do $$
declare
  f text;
  fns text[] := array[
    'ck_claim_campaign(uuid, text[])',
    'ck_release_campaign(uuid, text, text)',
    'ck_take_batch(uuid, int)',
    'ck_mark_result(uuid, text, text, text, text)',
    'ck_mark_results(uuid, jsonb)',
    'ck_safety_counts(uuid)',
    'ck_add_usage(date, int)',
    'ck_usage_days()',
    'ck_acquire_lock(text, int)',
    'ck_release_lock(text)',
    'ck_skip_queued_not_in(uuid, text[], text)',
    'ck_cancel_queued(uuid)',
    'ck_requeue_failed(uuid)'
  ];
begin
  foreach f in array fns loop
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke execute on function %s from authenticated', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;

-- ===================================================================
-- Part 2: HelaVoice segments
-- Each returns (recipient_id, email, name, rank). Oldest signups first.
-- Blocked users and empty emails are always excluded.
-- ===================================================================

create or replace function public.ck_seg_paid_customers()
returns table(recipient_id text, email text, name text, rank int)
language sql stable security definer set search_path = public as $$
  select p.id::text, p.email, p.full_name, extract(epoch from p.created_at)::int
  from profiles p
  where exists (select 1 from purchases pu where pu.user_id = p.id) and p.is_blocked = false
    and p.email is not null and btrim(p.email) <> ''
$$;

create or replace function public.ck_seg_free_users()
returns table(recipient_id text, email text, name text, rank int)
language sql stable security definer set search_path = public as $$
  select p.id::text, p.email, p.full_name, extract(epoch from p.created_at)::int
  from profiles p
  where not exists (select 1 from purchases pu where pu.user_id = p.id) and p.is_blocked = false
    and p.email is not null and btrim(p.email) <> ''
$$;

create or replace function public.ck_seg_recent_signups(days int)
returns table(recipient_id text, email text, name text, rank int)
language sql stable security definer set search_path = public as $$
  select p.id::text, p.email, p.full_name, extract(epoch from p.created_at)::int
  from profiles p
  where p.created_at > now() - make_interval(days => days) and p.is_blocked = false
    and p.email is not null and btrim(p.email) <> ''
$$;

create or replace function public.ck_seg_all_users()
returns table(recipient_id text, email text, name text, rank int)
language sql stable security definer set search_path = public as $$
  select p.id::text, p.email, p.full_name, extract(epoch from p.created_at)::int
  from profiles p
  where p.is_blocked = false
    and p.email is not null and btrim(p.email) <> ''
$$;

-- Segment functions read customer emails: service_role only (never anon/authenticated).
revoke execute on function public.ck_seg_paid_customers() from public;
revoke execute on function public.ck_seg_free_users() from public;
revoke execute on function public.ck_seg_recent_signups(int) from public;
revoke execute on function public.ck_seg_all_users() from public;
do $$
declare f text;
begin
  foreach f in array array['ck_seg_paid_customers()', 'ck_seg_free_users()', 'ck_seg_recent_signups(int)', 'ck_seg_all_users()'] loop
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function public.%s from anon', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke execute on function public.%s from authenticated', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function public.%s to service_role', f);
    end if;
  end loop;
end $$;

-- Public bucket for email banner images (uploaded by the campaign worker with the service key).
insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', true)
on conflict (id) do nothing;
