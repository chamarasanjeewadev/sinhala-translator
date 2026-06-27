import { createClient } from "@/lib/supabase/server";
import {
  normalizeStructuredTranscription,
  normalizeTranscriptionText,
} from "@/lib/transcription-format";
import { privateJson } from "@/lib/api-response";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    text: string;
    durationSeconds: number;
    creditsUsed: number;
    isPartial: boolean;
    hasTimestamps?: boolean;
    isConversation?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const { text, durationSeconds, creditsUsed, isPartial } = body;
  const hasTimestamps = body.hasTimestamps === true;
  const isConversation = body.isConversation === true;
  const normalizedText =
    hasTimestamps || isConversation
      ? normalizeStructuredTranscription(text)
      : normalizeTranscriptionText(text);

  if (!normalizedText) {
    return privateJson(
      { error: "Missing transcription text" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("transcriptions")
    .insert({
      user_id: user.id,
      transcription_text: normalizedText,
      audio_duration_seconds: Math.round(durationSeconds),
      credits_used: creditsUsed,
      is_partial: isPartial,
      has_timestamps: hasTimestamps,
      is_conversation: isConversation,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save transcription:", error);
    return privateJson(
      { error: "Failed to save transcription" },
      { status: 500 }
    );
  }

  return privateJson({ transcriptionId: data.id });
}
