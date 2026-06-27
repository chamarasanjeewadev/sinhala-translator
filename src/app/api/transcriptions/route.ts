import { createClientFromRequest } from "@/lib/supabase/request";
import { privateJson } from "@/lib/api-response";

const hardDeleteTranscriptions =
  process.env.HARD_DELETE_TRANSCRIPTIONS === "true";

export async function GET(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: transcriptions, error } = await supabase
    .from("transcriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch transcriptions:", error);
    return privateJson(
      { error: "Failed to fetch transcriptions" },
      { status: 500 }
    );
  }

  return privateJson({ transcriptions });
}

export async function PATCH(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return privateJson(
      { error: "Missing transcription ID" },
      { status: 400 }
    );
  }

  const body: { text?: string; englishTranslation?: string } = await request.json();

  if (body.text === undefined && body.englishTranslation === undefined) {
    return privateJson({ error: "No fields to update" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (typeof body.text === "string") updates.transcription_text = body.text;
  if (typeof body.englishTranslation === "string") updates.english_translation = body.englishTranslation;

  const { error } = await supabase
    .from("transcriptions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  if (error) {
    console.error("Failed to update transcription:", error);
    return privateJson(
      { error: "Failed to update transcription" },
      { status: 500 }
    );
  }

  return privateJson({ success: true });
}

export async function DELETE(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return privateJson(
      { error: "Missing transcription ID" },
      { status: 400 }
    );
  }

  const { error } = hardDeleteTranscriptions
    ? await supabase
        .from("transcriptions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase
        .from("transcriptions")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("is_deleted", false);

  if (error) {
    console.error("Failed to delete transcription:", error);
    return privateJson(
      { error: "Failed to delete transcription" },
      { status: 500 }
    );
  }

  return privateJson({ success: true });
}
