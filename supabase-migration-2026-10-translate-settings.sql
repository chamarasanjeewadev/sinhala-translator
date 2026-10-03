-- Live translate provider settings
-- Run in Supabase SQL editor.
-- Adds two app_settings rows for the live translate (any language → Sinhala) feature.
-- translate_provider: "gemini" (default) or "openai"
-- translate_model: Gemini model name (gemini) or Whisper model (openai)

insert into app_settings (key, value, updated_at)
values
  ('translate_provider', 'gemini',             now()),
  ('translate_model',    'gemini-flash-latest', now())
on conflict (key) do nothing;
