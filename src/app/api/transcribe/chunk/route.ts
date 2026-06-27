import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { privateJson } from "@/lib/api-response";
import {
  transcribeAudio,
  type TranscribeResult,
} from "@/lib/transcription-provider";
import { offsetTimestamps } from "@/lib/transcription-format";
import {
  CHUNK_DURATION_SECONDS,
  MAX_RETRIES,
  TARGET_SAMPLE_RATE,
} from "@/lib/constants";

const MAX_PREVIOUS_TAIL_CHARS = 500;
const MAX_KNOWN_SPEAKERS = 10;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    audio: string;
    chunkIndex: number;
    totalChunks: number;
    chunkDurationSec?: number;
    conversation?: boolean;
    timestamps?: boolean;
    previousTail?: string;
    knownSpeakers?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const { audio, chunkIndex, totalChunks, chunkDurationSec } = body;
  const conversation = body.conversation === true;
  const timestamps = body.timestamps === true;
  const previousTail =
    conversation && typeof body.previousTail === "string"
      ? body.previousTail.slice(-MAX_PREVIOUS_TAIL_CHARS)
      : undefined;
  const knownSpeakers =
    conversation && Array.isArray(body.knownSpeakers)
      ? body.knownSpeakers
          .filter((s): s is string => typeof s === "string")
          .slice(0, MAX_KNOWN_SPEAKERS)
      : undefined;

  if (!audio || chunkIndex === undefined || !totalChunks) {
    return privateJson(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return privateJson(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  // Check if user has sufficient credits BEFORE attempting transcription
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (!profile || profile.credits < 1) {
    return privateJson(
      { error: "Insufficient credits" },
      { status: 402 }
    );
  }

  // Retry logic for the transcription API call with timeout
  let result: TranscribeResult | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      result = await transcribeAudio({
        apiKey,
        audioBase64: audio,
        sampleRateHertz: TARGET_SAMPLE_RATE,
        mimeType: "audio/wav",
        conversation,
        timestamps,
        previousTail,
        knownSpeakers,
      });
      lastError = null;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`Transcription attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt < MAX_RETRIES) {
        // Wait briefly before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  if (lastError || !result) {
    console.error("Transcription error after retries:", lastError);
    return privateJson(
      { error: `Failed to transcribe audio chunk: ${lastError?.message ?? "unknown error"}` },
      { status: 500 }
    );
  }

  // Gemini returns timestamps relative to the chunk; shift them to absolute
  // time within the full recording.
  let text = result.text;
  if (timestamps) {
    text = offsetTimestamps(text, chunkIndex * CHUNK_DURATION_SECONDS);
  }

  // Log token usage for cost tracking. Must never fail the transcription.
  try {
    const admin = createAdminClient();
    const { error: usageError } = await admin.from("gemini_usage").insert({
      user_id: user.id,
      model: result.model,
      chunk_index: chunkIndex,
      total_chunks: totalChunks,
      audio_seconds: chunkDurationSec ?? CHUNK_DURATION_SECONDS,
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

  // ONLY deduct credit AFTER successful transcription
  const { data: deductResult, error: deductError } = await supabase.rpc(
    "deduct_credit",
    {
      p_user_id: user.id,
      p_description: `Transcription chunk ${chunkIndex + 1}/${totalChunks}`,
    }
  );

  if (deductError || !deductResult?.success) {
    console.error("Credit deduction failed:", deductError);
    // Transcription succeeded but credit deduction failed - still return the text
    // This is better than losing the transcription
    const message = deductResult?.error_message || "Credit deduction failed";
    console.warn(message);
  }

  return privateJson({
    text,
    creditsRemaining: deductResult?.remaining_credits ?? profile.credits - 1,
    chunkIndex,
  });
}
