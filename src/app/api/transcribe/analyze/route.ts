import { createClient } from "@/lib/supabase/server";
import { privateJson } from "@/lib/api-response";

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

  const requiredCredits = Math.ceil(durationSeconds / 60);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return privateJson(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }

  const currentCredits = profile.credits;

  return privateJson({
    durationSeconds,
    requiredCredits,
    currentCredits,
    canProceed: currentCredits >= requiredCredits,
  });
}
