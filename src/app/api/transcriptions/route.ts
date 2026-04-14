import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: transcriptions, error } = await supabase
    .from("transcriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch transcriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transcriptions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ transcriptions });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing transcription ID" },
      { status: 400 }
    );
  }

  const body: { text?: string; englishTranslation?: string } = await request.json();

  if (body.text === undefined && body.englishTranslation === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (typeof body.text === "string") updates.transcription_text = body.text;
  if (typeof body.englishTranslation === "string") updates.english_translation = body.englishTranslation;

  const { error } = await supabase
    .from("transcriptions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update transcription:", error);
    return NextResponse.json(
      { error: "Failed to update transcription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing transcription ID" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("transcriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete transcription:", error);
    return NextResponse.json(
      { error: "Failed to delete transcription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
