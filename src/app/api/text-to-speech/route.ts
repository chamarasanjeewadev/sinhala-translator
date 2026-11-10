import { createClientFromRequest } from "@/lib/supabase/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { privateJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportError, toClientError } from "@/lib/report-error";
import { synthesizeSinhalaSpeech } from "@/lib/gemini-tts";
import { freeCharsUsed } from "@/lib/tts-usage";
import {
  DEFAULT_TTS_VOICE,
  TTS_FREE_CHARS,
  TTS_MAX_CHARS,
  isTtsVoice,
  ttsCharge,
} from "@/lib/text-to-speech";

// Sinhala text → speech. Signed-in only: each account gets TTS_FREE_CHARS free
// (≈ 1 minute, lifetime), then credits per TTS_CHARS_PER_CREDIT characters.
// Credits are deducted AFTER a successful generation, like the other pipelines.

/** Allowance + balance for the page header. Anonymous callers just see the free offer. */
export async function GET(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);
  if (!user) return privateJson({ signedIn: false, freeCharsLeft: TTS_FREE_CHARS, credits: 0 });

  try {
    const [used, { data: profile }] = await Promise.all([
      freeCharsUsed(user.id),
      supabase.from("profiles").select("credits").eq("id", user.id).single(),
    ]);
    return privateJson({
      signedIn: true,
      freeCharsLeft: Math.max(0, TTS_FREE_CHARS - used),
      credits: profile?.credits ?? 0,
    });
  } catch (err) {
    reportError(err, { route: "text-to-speech:status", userId: user.id });
    return privateJson({ error: "Could not load usage" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);
  if (!user) return privateJson({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });

  if (!(await checkRateLimit(`tts:${user.id}`, "TRANSLATE_RATE_LIMITER"))) {
    return privateJson(
      { error: "Too many requests. Please wait a minute and try again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  let body: { text?: unknown; voice?: unknown };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return privateJson({ error: "Missing text" }, { status: 400 });
  if (text.length > TTS_MAX_CHARS) {
    return privateJson(
      { error: `Text is too long (max ${TTS_MAX_CHARS} characters).`, code: "TOO_LONG", limit: TTS_MAX_CHARS },
      { status: 413 }
    );
  }
  if (body.voice !== undefined && !isTtsVoice(body.voice)) {
    return privateJson({ error: "Unknown voice" }, { status: 400 });
  }
  const voice = body.voice ?? DEFAULT_TTS_VOICE;

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) return privateJson({ error: "Speech service not configured" }, { status: 500 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, is_blocked")
    .eq("id", user.id)
    .single();
  if (profile?.is_blocked) return privateJson({ error: "Account suspended" }, { status: 403 });
  if (!profile) return privateJson({ error: "Profile not found" }, { status: 404 });

  let used: number;
  try {
    used = await freeCharsUsed(user.id);
  } catch (err) {
    reportError(err, { route: "text-to-speech", userId: user.id });
    return privateJson({ error: "Could not generate audio. Please try again." }, { status: 500 });
  }

  // Check the balance BEFORE paying Gemini for the audio.
  const charge = ttsCharge(text.length, used);
  if (profile.credits < charge.credits) {
    return privateJson(
      { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS", creditsNeeded: charge.credits },
      { status: 402 }
    );
  }

  let result;
  try {
    result = await synthesizeSinhalaSpeech({ apiKey, text, voice });
  } catch (err) {
    reportError(err, { route: "text-to-speech", userId: user.id, voice });
    const { message, code, status } = toClientError(err, "Could not generate audio. Please try again.");
    return privateJson({ error: message, code }, { status });
  }

  let creditsRemaining = profile.credits;
  if (charge.credits > 0) {
    const { data: rows, error } = await supabase.rpc("deduct_credits_typed", {
      p_user_id: user.id,
      p_amount: charge.credits,
      p_type: "text_to_speech",
      p_description: `Sinhala text to speech (${text.length} chars)`,
    });
    const deducted = Array.isArray(rows) ? rows[0] : rows;
    if (error || !deducted?.success) {
      // Audio already exists — return it rather than lose the user's result.
      console.error("TTS credit deduction failed:", error);
    } else {
      creditsRemaining = deducted.credits_remaining;
    }
  }

  // Usage log doubles as the free-allowance ledger. Must never fail the request.
  // shortcut: read-then-insert, so parallel requests can each get the free allowance;
  // bounded by the per-user rate limit — move into an RPC if abuse shows up.
  try {
    const { error } = await createAdminClient().from("tts_generations").insert({
      user_id: user.id,
      chars: text.length,
      free_chars: charge.free,
      credits: charge.credits,
      audio_seconds: Math.round(result.seconds * 100) / 100,
      model: result.model,
      voice,
    });
    if (error) console.error("tts_generations insert failed:", error);
  } catch (err) {
    console.error("tts_generations insert failed:", err);
  }

  return new Response(result.wav as BodyInit, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "private, no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      Vary: "Cookie, Authorization",
      "X-Tts-Free-Chars-Left": String(Math.max(0, TTS_FREE_CHARS - used - charge.free)),
      "X-Tts-Credits-Charged": String(charge.credits),
      "X-Credits-Remaining": String(creditsRemaining),
    },
  });
}
