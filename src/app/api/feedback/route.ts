import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    transcriptionId?: string;
    rating?: number;
    feedback?: string;
    wouldRecommend?: boolean;
    notRecommendReason?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    transcriptionId,
    rating,
    feedback = "",
    wouldRecommend,
    notRecommendReason = null,
  } = body;

  if (!transcriptionId || typeof transcriptionId !== "string") {
    return NextResponse.json({ error: "Missing transcriptionId" }, { status: 400 });
  }

  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be an integer between 1 and 5" }, { status: 400 });
  }

  if (typeof wouldRecommend !== "boolean") {
    return NextResponse.json({ error: "Missing recommendation value" }, { status: 400 });
  }

  if (!wouldRecommend && (!notRecommendReason || notRecommendReason.trim() === "")) {
    return NextResponse.json({ error: "Please tell us why you would not recommend it" }, { status: 400 });
  }

  const { data: transcription, error: transcriptionError } = await supabase
    .from("transcriptions")
    .select("id, user_id")
    .eq("id", transcriptionId)
    .eq("is_deleted", false)
    .single();

  if (transcriptionError || !transcription || transcription.user_id !== user.id) {
    return NextResponse.json({ error: "Transcription not found" }, { status: 404 });
  }

  const { error: insertError } = await supabase
    .from("transcription_feedback")
    .upsert(
      {
        user_id: user.id,
        transcription_id: transcriptionId,
        rating,
        feedback_text: feedback.trim() || null,
        would_recommend: wouldRecommend,
        not_recommend_reason:
          wouldRecommend ? null : (notRecommendReason?.trim() || null),
      },
      { onConflict: "user_id,transcription_id" }
    );

  if (insertError) {
    console.error("Failed to save feedback:", insertError);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
