import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/request";
import { privateJson } from "@/lib/api-response";

const PROMO_CODES: Record<string, { credits: number; description: string }> = {
  HELA5FREE: {
    credits: 60,
    description: "Promo code: HELA5FREE (60 credits)",
  },
  LAW26: {
    credits: 60,
    description: "Promo code: LAW26 (60 credits)",
  },
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

  const promo = code ? PROMO_CODES[code] : null;
  if (!promo) {
    return privateJson({ error: "Invalid promo code." }, { status: 400 });
  }

  const idempotencyKey = `promo_${code}_${user.id}`;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("credit_transactions")
    .select("id")
    .eq("stripe_session_id", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return privateJson(
      { error: "Promo code already redeemed." },
      { status: 409 }
    );
  }

  const { data, error } = await admin.rpc("add_credits", {
    p_user_id: user.id,
    p_amount: promo.credits,
    p_stripe_session_id: idempotencyKey,
    p_description: promo.description,
  });

  if (error || !data?.success) {
    console.error("Failed to apply promo code:", error ?? data?.error_message);
    return privateJson({ error: "Failed to apply promo code." }, { status: 500 });
  }

  return privateJson({ credits: data.new_balance });
}
