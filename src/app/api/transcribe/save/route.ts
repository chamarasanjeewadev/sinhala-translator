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
    text: string;
    durationSeconds: number;
    creditsUsed: number;
    isPartial: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { text, durationSeconds, creditsUsed, isPartial } = body;

  if (!text) {
    return NextResponse.json(
      { error: "Missing transcription text" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("transcriptions")
    .insert({
      user_id: user.id,
      transcription_text: text,
      audio_duration_seconds: Math.round(durationSeconds),
      credits_used: creditsUsed,
      is_partial: isPartial,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save transcription:", error);
    return NextResponse.json(
      { error: "Failed to save transcription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ transcriptionId: data.id });
}
