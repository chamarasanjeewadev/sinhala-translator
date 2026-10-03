import { createClientFromRequest } from "@/lib/supabase/request";
import { privateJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTranslateConfig } from "@/lib/app-settings";
import { translateAudioBidirectional } from "@/lib/realtime-translate-provider";
import { synthesizeSpeech } from "@/lib/tts-provider";
import { reportError, toClientError } from "@/lib/report-error";

// 1 credit per utterance (STT + translation + TTS in one call)
const CREDITS_PER_CALL = 1;

// ~15 MB binary ceiling — each push-to-talk utterance is well under 1 MB
const MAX_BASE64_CHARS = 19.5 * 1024 * 1024;

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);
  if (!user) return privateJson({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(`realtime-translate:${user.id}`))) {
    return privateJson(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  let body: {
    audio: string;
    mimeType?: string;
    /** ISO 639-1 code of the non-Sinhala language in the conversation, e.g. "en", "es" */
    foreignLanguage?: string;
    /** Whether to generate TTS audio of the translated text */
    withAudio?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    audio,
    mimeType = "audio/mp4",
    foreignLanguage = "en",
    withAudio = true,
  } = body;

  if (!audio || typeof audio !== "string") {
    return privateJson({ error: "Missing audio" }, { status: 400 });
  }
  if (audio.length > MAX_BASE64_CHARS) {
    return privateJson({ error: "Audio too large" }, { status: 413 });
  }

  // Pre-flight credit check
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (!profile || profile.credits < CREDITS_PER_CALL) {
    return privateJson(
      {
        error: "Insufficient credits. Please purchase more.",
        creditsNeeded: CREDITS_PER_CALL,
        creditsAvailable: profile?.credits ?? 0,
      },
      { status: 402 }
    );
  }

  const config = await getTranslateConfig();
  const geminiApiKey = process.env.GOOGLE_CLOUD_API_KEY ?? "";

  // Step 1: Transcribe + translate
  let translationResult: Awaited<ReturnType<typeof translateAudioBidirectional>>;
  try {
    translationResult = await translateAudioBidirectional({
      provider: config.provider,
      geminiApiKey,
      openaiApiKey: config.openaiApiKey,
      audioBase64: audio,
      mimeType,
      foreignLanguage,
      model: config.model,
    });
  } catch (err) {
    reportError(err, { route: "realtime-translate/stt", userId: user.id });
    const clientErr = toClientError(err);
    return privateJson(
      { error: clientErr.message, code: clientErr.code },
      { status: clientErr.status }
    );
  }

  if (!translationResult.translatedText) {
    // Silent or unclear audio — no credit deducted
    return privateJson({
      translatedText: "",
      detectedLanguage: translationResult.detectedLanguage,
      targetLanguage: translationResult.targetLanguage,
      audioBase64: null,
      audioMimeType: null,
      model: translationResult.model,
      creditsUsed: 0,
      creditsRemaining: profile.credits,
    });
  }

  // Step 2: Generate TTS audio for the translated text
  let audioBase64: string | null = null;
  let audioMimeType: string | null = null;

  if (withAudio) {
    try {
      const tts = await synthesizeSpeech({
        apiKey: geminiApiKey,
        text: translationResult.translatedText,
        language: translationResult.targetLanguage,
      });
      audioBase64 = tts.audioBase64;
      audioMimeType = tts.audioMimeType;
    } catch (err) {
      // TTS failure is non-fatal — return text without audio
      reportError(err, { route: "realtime-translate/tts", userId: user.id });
    }
  }

  // Step 3: Deduct credit
  const { data: deductData, error: deductError } = await supabase.rpc(
    "deduct_n_credits",
    {
      p_user_id: user.id,
      p_amount: CREDITS_PER_CALL,
      p_description: "Live translate",
    }
  );

  if (deductError || !deductData?.[0]?.success) {
    return privateJson(
      { error: "Insufficient credits. Please purchase more." },
      { status: 402 }
    );
  }

  return privateJson({
    translatedText: translationResult.translatedText,
    detectedLanguage: translationResult.detectedLanguage,
    targetLanguage: translationResult.targetLanguage,
    audioBase64,
    audioMimeType,
    model: translationResult.model,
    creditsUsed: CREDITS_PER_CALL,
    creditsRemaining: deductData[0].credits_remaining as number,
  });
}
