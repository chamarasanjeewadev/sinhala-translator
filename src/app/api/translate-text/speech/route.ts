import { createClientFromRequest } from "@/lib/supabase/request";
import { privateJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { synthesizeSpeech } from "@/lib/tts-provider";
import { reportError } from "@/lib/report-error";
import { clientIp, SPEECH_TEXT_LIMIT } from "@/lib/text-translate";

// "Listen" button on the public translator: speaks a short English or Sinhala
// text via Google Cloud TTS. Free, capped and rate-limited like translate-text.
export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  const rateKey = user ? `translate-tts:user:${user.id}` : `translate-tts:ip:${clientIp(request)}`;
  if (!(await checkRateLimit(rateKey, "TRANSLATE_RATE_LIMITER"))) {
    return privateJson(
      { error: "Too many requests. Please wait a minute and try again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  let body: { text?: unknown; language?: unknown };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const { text, language } = body;
  if (language !== "en" && language !== "si") {
    return privateJson({ error: "language must be en or si" }, { status: 400 });
  }
  if (typeof text !== "string" || text.trim() === "") {
    return privateJson({ error: "Missing text" }, { status: 400 });
  }
  if (text.length > SPEECH_TEXT_LIMIT) {
    return privateJson(
      { error: `Text is too long to read aloud (max ${SPEECH_TEXT_LIMIT} characters).`, code: "TOO_LONG" },
      { status: 413 }
    );
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return privateJson({ error: "Speech service not configured" }, { status: 500 });
  }

  try {
    const { audioBase64, audioMimeType } = await synthesizeSpeech({
      apiKey,
      text: text.trim(),
      language,
    });
    return privateJson({ audioBase64, audioMimeType });
  } catch (err) {
    reportError(err, { route: "translate-text/speech", userId: user?.id });
    return privateJson({ error: "Could not generate audio. Please try again." }, { status: 502 });
  }
}
