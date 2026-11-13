import { createClient } from "@/lib/supabase/server";
import { privateJson } from "@/lib/api-response";
import { CHUNK_DURATION_SECONDS } from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { durationSeconds: number };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const { durationSeconds } = body;

  if (!durationSeconds || durationSeconds <= 0) {
    return privateJson(
      { error: "Invalid duration" },
      { status: 400 }
    );
  }

  // Must match billing: transcribe/chunk deducts 1 credit per CHUNK_DURATION_SECONDS chunk.
  const requiredCredits = Math.ceil(durationSeconds / CHUNK_DURATION_SECONDS);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits, is_blocked")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return privateJson(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }

  if (profile.is_blocked) {
    return privateJson({ error: "Account suspended" }, { status: 403 });
  }

  const currentCredits = profile.credits;

  return privateJson({
    durationSeconds,
    requiredCredits,
    currentCredits,
    canProceed: currentCredits >= requiredCredits,
  });
}
