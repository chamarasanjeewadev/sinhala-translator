-- ============================================================
-- 2026-10: Admin-controlled large audio upload limit
--
-- large_upload_enabled: 'true' lets users upload audio up to large_upload_mb.
--   Anything else (or missing) = the default 25 MB cap.
-- large_upload_mb: cap in MB when enabled (clamped 25..500 by the app).
--
-- Seeded ENABLED at 500 MB. ON CONFLICT DO NOTHING so later admin changes
-- survive a re-run. Flip/adjust from the admin app Costs dashboard.
-- ============================================================
insert into public.app_settings (key, value) values
  ('large_upload_enabled', 'true'),
  ('large_upload_mb', '500')
on conflict (key) do nothing;
