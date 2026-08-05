import { createClientFromRequest } from "@/lib/supabase/request";
import { privateJson } from "@/lib/api-response";
import {
  MAX_VIDEO_DURATION_SECONDS,
  SUBTITLE_CREDITS_PER_MINUTE,
} from "@/lib/constants";

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

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

  if (
    !durationSeconds ||
    durationSeconds <= 0 ||
    durationSeconds > MAX_VIDEO_DURATION_SECONDS
  ) {
    return privateJson({ error: "Invalid duration" }, { status: 400 });
  }

  const requiredCredits =
    Math.ceil(durationSeconds / 60) * SUBTITLE_CREDITS_PER_MINUTE;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits, is_blocked")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return privateJson({ error: "Failed to fetch profile" }, { status: 500 });
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
