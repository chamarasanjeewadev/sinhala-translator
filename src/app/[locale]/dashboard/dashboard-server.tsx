import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "./dashboard-content";
import { gateTranscriptions } from "@/lib/transcript-preview";
import { redirect } from "next/navigation";

export async function DashboardServer() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
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
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  // Download gate: users who have never purchased (or redeemed a promo) get a
  // preview only, truncated server-side so the full text never reaches the
  // client.
  const hasPurchased = profile?.has_purchased ?? false;

  return (
    <DashboardContent
      initialCredits={profile?.credits ?? 0}
      initialTranscriptions={gateTranscriptions(transcriptions ?? [], hasPurchased)}
      hasPurchased={hasPurchased}
    />
  );
}
