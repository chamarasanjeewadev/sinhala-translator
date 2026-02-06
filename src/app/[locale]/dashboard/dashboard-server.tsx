import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "./dashboard-content";

export async function DashboardServer() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: transcriptions } = await supabase
    .from("transcriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <DashboardContent
      initialCredits={profile?.credits ?? 0}
      initialTranscriptions={transcriptions ?? []}
    />
  );
}
