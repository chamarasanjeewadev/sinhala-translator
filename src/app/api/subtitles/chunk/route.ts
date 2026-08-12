import { createClientFromRequest } from "@/lib/supabase/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { privateJson } from "@/lib/api-response";
import { reportError, toClientError } from "@/lib/report-error";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateSubtitlesWithGemini,
  type GeminiSubtitleResult,
} from "@/lib/gemini-subtitles";
import { normalizeSegments, offsetSegments } from "@/lib/subtitle-format";
import {
  CHUNK_DURATION_SECONDS,
  MAX_RETRIES,
  SUBTITLE_CREDITS_PER_MINUTE,
} from "@/lib/constants";
import type { SubtitleLanguage } from "@/lib/types";

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`subtitles:${user.id}`))) {
    return privateJson(
      { error: "Too many requests. Please slow down and try again." },
      { status: 429 }
    );
  }

  let body: {
    audio: string;
    chunkIndex: number;
    totalChunks: number;
    chunkDurationSec?: number;
    language?: SubtitleLanguage;
  };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const { audio, chunkIndex, totalChunks } = body;
  const chunkDurationSec =
    typeof body.chunkDurationSec === "number" &&
    body.chunkDurationSec > 0 &&
    body.chunkDurationSec <= CHUNK_DURATION_SECONDS
      ? body.chunkDurationSec
      : CHUNK_DURATION_SECONDS;
  const language: SubtitleLanguage =
    body.language === "en" || body.language === "auto" ? body.language : "si";

  if (!audio || chunkIndex === undefined || !totalChunks) {
    return privateJson({ error: "Missing required fields" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return privateJson({ error: "API key not configured" }, { status: 500 });
  }

  // 2 credits per started minute of this chunk (4 for a full 120s chunk)
  const chunkCredits =
    Math.ceil(chunkDurationSec / 60) * SUBTITLE_CREDITS_PER_MINUTE;

  // Check credits BEFORE calling the model
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, is_blocked")
    .eq("id", user.id)
    .single();

  if (profile?.is_blocked) {
    return privateJson({ error: "Account suspended" }, { status: 403 });
  }

  if (!profile || profile.credits < chunkCredits) {
    return privateJson({ error: "Insufficient credits" }, { status: 402 });
  }

  let result: GeminiSubtitleResult | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      result = await generateSubtitlesWithGemini({
        apiKey,
        audioBase64: audio,
        chunkDurationSec,
        language,
      });
      lastError = null;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `Subtitle generation attempt ${attempt + 1} failed:`,
        lastError.message
      );
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  if (lastError || !result) {
    reportError(lastError, {
      route: "subtitles/chunk",
      userId: user.id,
      chunkIndex,
      totalChunks,
    });
    // Never surface the raw provider error (model names, billing URLs, quota
    // details) to the client — return a generic, safe message + code.
    const { message, code, status } = toClientError(
      lastError,
      "Subtitle generation failed. Please try again."
    );
    return privateJson({ error: message, code }, { status });
  }

  // Validate/clamp the model output, then shift chunk-relative times to
  // absolute time within the full video.
  const segments = offsetSegments(
    normalizeSegments(result.rawSegments, chunkDurationSec),
    chunkIndex * CHUNK_DURATION_SECONDS
  );

  // Log token usage for cost tracking. Must never fail the request.
  try {
    const admin = createAdminClient();
    const { error: usageError } = await admin.from("gemini_usage").insert({
      user_id: user.id,
      model: result.model,
      chunk_index: chunkIndex,
      total_chunks: totalChunks,
      audio_seconds: chunkDurationSec,
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

  // ONLY deduct credits AFTER successful generation
  const { data: deductRows, error: deductError } = await supabase.rpc(
    "deduct_credits_typed",
    {
      p_user_id: user.id,
      p_amount: chunkCredits,
      p_type: "subtitles",
      p_description: `Subtitles chunk ${chunkIndex + 1}/${totalChunks}`,
    }
  );

  const deductResult = Array.isArray(deductRows) ? deductRows[0] : deductRows;
  if (deductError || !deductResult?.success) {
    // Generation succeeded but deduction failed — still return the segments
    console.error("Credit deduction failed:", deductError);
  }

  return privateJson({
    segments,
    creditsRemaining:
      deductResult?.credits_remaining ?? profile.credits - chunkCredits,
    chunkIndex,
  });
}
