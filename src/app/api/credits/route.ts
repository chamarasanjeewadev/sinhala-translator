import { createClientFromRequest } from "@/lib/supabase/request";
import { privateJson } from "@/lib/api-response";

export async function GET(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (error) {
    return privateJson(
      { error: "Failed to fetch credits" },
      { status: 500 }
    );
  }

  return privateJson({ credits: profile.credits });
}
