import { createClientFromRequest } from "@/lib/supabase/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { privateJson } from "@/lib/api-response";

// Permanently deletes the authenticated user's account and all their data.
// Required by Apple App Store Guideline 5.1.1(v) (in-app account deletion).
// profiles, credit_transactions and transcriptions cascade from auth.users;
// gemini_usage is "on delete set null" so it is removed explicitly first.
export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { error: usageError } = await admin
    .from("gemini_usage")
    .delete()
    .eq("user_id", user.id);

  if (usageError) {
    console.error("Failed to delete gemini_usage rows:", usageError);
    return privateJson({ error: "Failed to delete account" }, { status: 500 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Failed to delete user:", deleteError);
    return privateJson({ error: "Failed to delete account" }, { status: 500 });
  }

  return privateJson({ success: true });
}
