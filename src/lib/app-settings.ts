import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Runtime transcription config, admin-controlled via the app_settings table
 * (see supabase-migration-2026-08-usage-thoughts-and-settings.sql). Falls back
 * to env/defaults when the setting is unset or the table is unreachable, so the
 * transcription path never breaks on a settings read.
 */
export interface TranscriptionConfig {
  model: string;
  /**
   * Gemini 3 "thinking" level: minimal | low | medium | high, or null to leave
   * the model's own default (i.e. don't send thinkingConfig). Defaults to
   * "minimal" — thinking tokens are billed at the output rate and add no value
   * for transcription.
   */
  thinkingLevel: string | null;
}

function defaults(): TranscriptionConfig {
  return {
    model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
    thinkingLevel: "minimal",
  };
}

/** Normalize a raw thinking_level setting to a value we send (or null to skip). */
function normalizeThinkingLevel(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v || v === "default") return null;
  if (["minimal", "low", "medium", "high"].includes(v)) return v;
  return null;
}

export async function getTranscriptionConfig(): Promise<TranscriptionConfig> {
  const fallback = defaults();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", ["gemini_model", "thinking_level"]);

    if (error || !data) return fallback;

    const map = new Map(data.map((r) => [r.key as string, r.value as string | null]));
    const model = (map.get("gemini_model") || "").trim() || fallback.model;
    const thinkingLevel = map.has("thinking_level")
      ? normalizeThinkingLevel(map.get("thinking_level"))
      : fallback.thinkingLevel;

    return { model, thinkingLevel };
  } catch {
    return fallback;
  }
}

/**
 * Whether new sign-ups receive the welcome free credits, admin-controlled via
 * the same app_settings table (key `signup_bonus_enabled`, read by the DB
 * trigger handle_new_user). Drives the "free credits" marketing copy so a single
 * admin toggle governs both the grant and the messaging. Every `[locale]` page
 * is already server-rendered per request (the root layout reads request
 * headers), so this read reflects the toggle immediately with no redeploy.
 * Defaults to enabled when the setting is unset or the table is unreachable
 * (fail-open), matching the trigger, so a settings blip never wrongly hides a
 * live free tier.
 */
export async function isSignupBonusEnabled(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "signup_bonus_enabled")
      .maybeSingle();

    if (error || !data) return true;
    const v = (data.value ?? "").trim().toLowerCase();
    return !["false", "0", "no", "off"].includes(v);
  } catch {
    return true;
  }
}
