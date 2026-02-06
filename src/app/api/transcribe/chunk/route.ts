import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/transcription-provider";
import { MAX_RETRIES, TARGET_SAMPLE_RATE } from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { audio: string; chunkIndex: number; totalChunks: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { audio, chunkIndex, totalChunks } = body;

  if (!audio || chunkIndex === undefined || !totalChunks) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
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
    return NextResponse.json(
      { error: "Insufficient credits" },
      { status: 402 }
    );
  }

  // Retry logic for the transcription API call with timeout
  let text = "";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      text = await transcribeAudio({
        apiKey,
        audioBase64: audio,
        sampleRateHertz: TARGET_SAMPLE_RATE,
        mimeType: "audio/wav",
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

  if (lastError) {
    console.error("Transcription error after retries:", lastError);
    return NextResponse.json(
      { error: `Failed to transcribe audio chunk: ${lastError.message}` },
      { status: 500 }
    );
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

  return NextResponse.json({
    text,
    creditsRemaining: deductResult?.remaining_credits ?? profile.credits - 1,
    chunkIndex,
  });
}
