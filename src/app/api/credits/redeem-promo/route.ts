import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/request";
import { privateJson } from "@/lib/api-response";
import { isDisposableEmail, normalizeEmail } from "@/lib/promo";

// Maps redeem_promo_code() error codes to HTTP status. The mobile app keys off
// the "already redeemed" substring, so keep that message text stable.
const ERROR_STATUS: Record<string, number> = {
  already_redeemed: 409,
  expired: 410,
  exhausted: 410,
  invalid: 400,
};

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const code =
    typeof body.code === "string" ? body.code.trim().toUpperCase() : null;

  if (!code) {
    return privateJson({ error: "Invalid promo code." }, { status: 400 });
  }

  const email = user.email;
  if (!email) {
    return privateJson(
      { error: "Your account has no email; promo codes aren't available." },
      { status: 400 }
    );
  }

  // Throwaway inboxes are the cheapest way to farm one-per-person promos.
  if (isDisposableEmail(email)) {
    return privateJson(
      { error: "This email domain isn't eligible for promo codes." },
      { status: 403 }
    );
  }

  // The DB enforces active/expiry/cap/one-per-email atomically — see
  // redeem_promo_code() in supabase-migration.sql.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("redeem_promo_code", {
    p_user_id: user.id,
    p_normalized_email: normalizeEmail(email),
    p_code: code,
  });

  if (error) {
    console.error("Failed to apply promo code:", error);
    return privateJson({ error: "Failed to apply promo code." }, { status: 500 });
  }

  if (!data?.success) {
    const status = ERROR_STATUS[data?.error_code as string] ?? 400;
    return privateJson(
      { error: data?.error_message ?? "Invalid promo code." },
      { status }
    );
  }

  return privateJson({ credits: data.new_balance });
}
