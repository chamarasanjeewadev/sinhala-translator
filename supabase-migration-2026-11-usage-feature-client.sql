-- gemini_usage: record which feature (transcription / subtitles) and which
-- client (web-desktop, web-mobile, android-app, ios-app) each AI call served,
-- so the weekly report and the admin cost page can split usage and cost.
-- Additive and nullable: rows written before this have NULLs.
alter table public.gemini_usage
  add column if not exists feature text,
  add column if not exists client text;
