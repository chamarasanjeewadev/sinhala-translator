import { createAdminClient } from "@/lib/supabase/admin";
import { FREE_CREDITS } from "@/lib/constants";

// Welcome-bonus amount bounds — keep in sync with the SQL trigger clamp in
// supabase-migration-2026-08-signup-bonus-amount.sql and the admin app.
const SIGNUP_BONUS_MIN = 1;
const SIGNUP_BONUS_MAX = 50;

function clampSignupBonusAmount(raw: string | null | undefined): number {
  const n = parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return FREE_CREDITS;
  return Math.min(SIGNUP_BONUS_MAX, Math.max(SIGNUP_BONUS_MIN, n));
}

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

export interface SignupBonusConfig {
  /** Whether new sign-ups receive the welcome free credits. */
  enabled: boolean;
  /** How many credits a new sign-up receives when enabled (clamped 1–50). */
  amount: number;
}

/**
 * The free-tier config that drives the marketing copy — both the ON/OFF switch
 * and the grant amount, read in a single query from the same app_settings rows
 * the DB trigger handle_new_user() uses. Fail-open (enabled + default amount) so
 * a settings blip never wrongly hides a live free tier or shows a wrong number.
 */
export async function getSignupBonusConfig(): Promise<SignupBonusConfig> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", ["signup_bonus_enabled", "signup_bonus_amount"]);

    if (error || !data) return { enabled: true, amount: FREE_CREDITS };

    const map = new Map(
      data.map((r) => [r.key as string, r.value as string | null])
    );
    const rawEnabled = (map.get("signup_bonus_enabled") ?? "").trim().toLowerCase();
    const enabled = !["false", "0", "no", "off"].includes(rawEnabled);
    return { enabled, amount: clampSignupBonusAmount(map.get("signup_bonus_amount")) };
  } catch {
    return { enabled: true, amount: FREE_CREDITS };
  }
}
