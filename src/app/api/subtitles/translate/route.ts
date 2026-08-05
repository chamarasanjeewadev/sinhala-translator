import { createClientFromRequest } from "@/lib/supabase/request";
import { privateJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  translateSegments,
  type TranslateDirection,
} from "@/lib/gemini-translate";
import { MAX_SUBTITLE_SEGMENTS } from "@/lib/constants";

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`subtitles-translate:${user.id}`))) {
    return privateJson(
      { error: "Too many requests. Please slow down and try again." },
      { status: 429 }
    );
  }

  let body: {
    segments?: { id?: unknown; text?: unknown }[];
    direction?: string;
  };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const direction: TranslateDirection =
    body.direction === "en-si" ? "en-si" : "si-en";

  if (
    !Array.isArray(body.segments) ||
    body.segments.length === 0 ||
    body.segments.length > MAX_SUBTITLE_SEGMENTS ||
    !body.segments.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.text === "string" &&
        s.text.length <= 500
    )
  ) {
    return privateJson({ error: "Invalid segments" }, { status: 400 });
  }

  const segments = body.segments as { id: string; text: string }[];
  const totalChars = segments.reduce((sum, s) => sum + s.text.length, 0);
  const creditsNeeded = Math.max(1, Math.ceil(totalChars / 1000));

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, is_blocked")
    .eq("id", user.id)
    .single();

  if (profile?.is_blocked) {
    return privateJson({ error: "Account suspended" }, { status: 403 });
  }

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

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return privateJson({ error: "API key not configured" }, { status: 500 });
  }

  let translated: string[];
  try {
    translated = await translateSegments(
      apiKey,
      segments.map((s) => s.text),
      direction
    );
  } catch (err) {
    console.error("Segment translation failed:", err);
    return privateJson(
      { error: "Translation failed. Please try again." },
      { status: 500 }
    );
  }

  // Deduct AFTER successful translation, via the existing translation biller
  const { data: deductRows, error: deductError } = await supabase.rpc(
    "deduct_n_credits",
    {
      p_user_id: user.id,
      p_amount: creditsNeeded,
      p_description: `Subtitle translation (${direction}, ${segments.length} segments)`,
    }
  );

  const deductResult = Array.isArray(deductRows) ? deductRows[0] : deductRows;
  if (deductError || !deductResult?.success) {
    console.error("Credit deduction failed:", deductError);
  }

  return privateJson({
    translations: segments.map((s, i) => ({ id: s.id, text: translated[i] })),
    creditsUsed: creditsNeeded,
    creditsRemaining:
      deductResult?.credits_remaining ?? profile.credits - creditsNeeded,
  });
}
