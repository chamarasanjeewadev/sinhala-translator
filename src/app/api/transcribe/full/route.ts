import { createClientFromRequest } from "@/lib/supabase/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { privateJson } from "@/lib/api-response";
import {
  transcribeAudio,
  type TranscribeResult,
} from "@/lib/transcription-provider";
import { MAX_RETRIES } from "@/lib/constants";

// Whole-file transcription for the mobile app: one request transcribes,
// bills and saves. Unlike the chunked web flow, timestamps come back
// absolute (no offsetting) and billing is ceil(duration / 60) upfront.

const ALLOWED_MIME_TYPES = new Set([
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/webm",
]);

// Gemini inline requests are capped at ~20 MB total; leave headroom for the
// prompt and JSON envelope. The mobile client enforces a 14 MB binary limit.
const MAX_AUDIO_BASE64_CHARS = 19.5 * 1024 * 1024;
const MAX_DURATION_SECONDS = 7200;
const WHOLE_FILE_TIMEOUT_MS = 300_000;

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    audio: string;
    mimeType?: string;
    durationSeconds: number;
    conversation?: boolean;
    timestamps?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const { audio, durationSeconds } = body;
  const mimeType = body.mimeType || "audio/mp4";
  const conversation = body.conversation === true;
  const timestamps = body.timestamps === true;

  if (!audio || typeof audio !== "string") {
    return privateJson({ error: "Missing audio" }, { status: 400 });
  }
  if (audio.length > MAX_AUDIO_BASE64_CHARS) {
    return privateJson({ error: "Audio file is too large" }, { status: 413 });
  }
  if (
    !durationSeconds ||
    typeof durationSeconds !== "number" ||
    durationSeconds <= 0 ||
    durationSeconds > MAX_DURATION_SECONDS
  ) {
    return privateJson({ error: "Invalid duration" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return privateJson({ error: "Unsupported audio format" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return privateJson({ error: "API key not configured" }, { status: 500 });
  }

  const creditsNeeded = Math.max(1, Math.ceil(durationSeconds / 60));

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (!profile || profile.credits < creditsNeeded) {
    return privateJson(
      {
        error: "Insufficient credits. Please purchase more.",
        creditsNeeded,
        creditsAvailable: profile?.credits ?? 0,
      },
      { status: 402 }
    );
  }

  // Retry transient provider failures, mirroring the chunked route.
  let result: TranscribeResult | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      result = await transcribeAudio({
        apiKey,
        audioBase64: audio,
        mimeType,
        conversation,
        timestamps,
        wholeFile: true,
        timeoutMs: WHOLE_FILE_TIMEOUT_MS,
      });
      lastError = null;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`Transcription attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  if (lastError || !result || !result.text) {
    console.error("Transcription error after retries:", lastError);
    return privateJson(
      { error: `Failed to transcribe audio: ${lastError?.message ?? "empty transcript"}` },
      { status: 500 }
    );
  }

  // Log token usage for cost tracking. Must never fail the transcription.
  try {
    const admin = createAdminClient();
    const { error: usageError } = await admin.from("gemini_usage").insert({
      user_id: user.id,
      model: result.model,
      chunk_index: null,
      total_chunks: null,
      audio_seconds: Math.round(durationSeconds),
      prompt_tokens: result.usage?.promptTokens ?? null,
      output_tokens: result.usage?.outputTokens ?? null,
      total_tokens: result.usage?.totalTokens ?? null,
    });
    if (usageError) {
      console.error("gemini_usage insert failed:", usageError);
    }
  } catch (err) {
    console.error("gemini_usage insert failed:", err);
  }

  // Deduct only after successful transcription. If the balance was drained
  // concurrently, keep the transcript anyway (never bill-and-lose).
  const { data: deductData, error: deductError } = await supabase.rpc(
    "deduct_n_credits",
    {
      p_user_id: user.id,
      p_amount: creditsNeeded,
      p_description: `Transcription: ${Math.round(durationSeconds)}s audio`,
    }
  );

  if (deductError || !deductData?.[0]?.success) {
    console.error("Credit deduction failed:", deductError ?? deductData?.[0]);
  }

  const creditsRemaining: number =
    deductData?.[0]?.credits_remaining ?? profile.credits - creditsNeeded;

  const { data: saved, error: saveError } = await supabase
    .from("transcriptions")
    .insert({
      user_id: user.id,
      transcription_text: result.text,
      audio_duration_seconds: Math.round(durationSeconds),
      credits_used: creditsNeeded,
      is_partial: false,
      has_timestamps: timestamps,
      is_conversation: conversation,
    })
    .select("id")
    .single();

  if (saveError || !saved) {
    console.error("Failed to save transcription:", saveError);
    // Credits already deducted — still return the text so it isn't lost.
    return privateJson({
      transcriptionId: null,
      text: result.text,
      creditsUsed: creditsNeeded,
      creditsRemaining,
    });
  }

  return privateJson({
    transcriptionId: saved.id,
    text: result.text,
    creditsUsed: creditsNeeded,
    creditsRemaining,
  });
}
