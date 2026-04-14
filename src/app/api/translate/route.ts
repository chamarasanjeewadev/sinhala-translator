import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateWithGemini } from "@/lib/gemini-translate";
import type { TranslateResponse } from "@/lib/types";

function calcCredits(text: string): number {
  return Math.max(1, Math.ceil(text.length / 1000));
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: { transcriptionId?: string; text?: string } = await request.json();
  const { transcriptionId, text } = body;

  if (!transcriptionId || !text || typeof text !== "string" || text.trim() === "") {
    return NextResponse.json({ error: "Missing transcriptionId or text" }, { status: 400 });
  }

  const creditsNeeded = calcCredits(text);

  // Pre-flight credit check
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (!profile || profile.credits < creditsNeeded) {
    return NextResponse.json(
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
    return NextResponse.json({ error: "Translation service not configured" }, { status: 500 });
  }

  // Translate
  let translation: string;
  try {
    translation = await translateWithGemini(apiKey, text);
  } catch (err) {
    console.error("Translation failed:", err);
    return NextResponse.json({ error: "Translation failed. Please try again." }, { status: 500 });
  }

  // Atomically deduct credits
  const { data: deductData, error: deductError } = await supabase.rpc("deduct_n_credits", {
    p_user_id: user.id,
    p_amount: creditsNeeded,
    p_description: "Translation",
  });

  if (deductError || !deductData?.[0]?.success) {
    return NextResponse.json(
      { error: "Insufficient credits. Please purchase more." },
      { status: 402 }
    );
  }

  const creditsRemaining: number = deductData[0].credits_remaining;

  // Save translation to DB
  const { error: updateError } = await supabase
    .from("transcriptions")
    .update({ english_translation: translation })
    .eq("id", transcriptionId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Failed to save translation:", updateError);
    // Credits already deducted — still return translation so user isn't left with nothing
  }

  const response: TranslateResponse = {
    translation,
    creditsUsed: creditsNeeded,
    creditsRemaining,
  };

  return NextResponse.json(response);
}
