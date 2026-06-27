import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IAP_PRODUCTS } from "@/lib/constants";

// RevenueCat webhook: credits Apple In-App Purchases (consumable credit
// packs) bought in the mobile app. RevenueCat verifies the purchase with
// Apple before sending this event; we authenticate the webhook with a shared
// secret in the Authorization header (configured in the RevenueCat dashboard
// and stored as the REVENUECAT_WEBHOOK_SECRET Cloudflare secret).
//
// app_user_id is the Supabase user id (the app calls Purchases.logIn(uid)).
// add_credits is idempotent on its text key, so webhook retries and manual
// replays never double-credit.

interface RevenueCatEvent {
  type: string;
  id: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  price?: number; // USD-normalized by RevenueCat
  currency?: string;
  price_in_purchased_currency?: number;
}

export async function POST(request: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("REVENUECAT_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event?: RevenueCatEvent };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const event = body.event;
  if (!event) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  // Credit packs are consumables → NON_RENEWING_PURCHASE. Ignore the rest
  // (TEST events, TRANSFER, etc.) with a 200 so RevenueCat doesn't retry.
  if (event.type !== "NON_RENEWING_PURCHASE") {
    return NextResponse.json({ received: true });
  }

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const candidates = [event.app_user_id, event.original_app_user_id];
  // The app calls Purchases.logIn(<supabase uid>) before any purchase, so a
  // non-UUID id ($RCAnonymousID:...) means we cannot credit anyone — log it
  // and ack with 200 to avoid an endless retry loop.
  const userId = candidates.find((id) => id && UUID_RE.test(id));
  const product = event.product_id ? IAP_PRODUCTS[event.product_id] : undefined;

  if (!userId || !product) {
    console.error(
      "RevenueCat event missing Supabase user or unknown product:",
      event.id,
      event.app_user_id,
      event.product_id
    );
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_amount: product.credits,
    p_stripe_session_id: `rc_${event.id}`,
    p_description: `IAP purchase: ${product.name} (${product.credits} credits)`,
  });

  if (error) {
    console.error("Failed to add IAP credits:", error);
    return NextResponse.json(
      { error: "Failed to add credits" },
      { status: 500 }
    );
  }

  if (!data?.success) {
    console.error("add_credits RPC failed:", data?.error_message);
    return NextResponse.json(
      { error: data?.error_message ?? "add_credits failed" },
      { status: 500 }
    );
  }

  // Accounting record (money side). event.price is the USD-normalized amount
  // the customer paid; sandbox events carry 0, so fall back to the list
  // price. Runs after the credit grant so bookkeeping failures never block
  // it; a 500 makes RevenueCat retry, which is safe — add_credits is
  // idempotent on the event id and this upsert ignores duplicates.
  const amountCents =
    typeof event.price === "number" && event.price > 0
      ? Math.round(event.price * 100)
      : product.priceUsdCents;

  const { error: purchaseError } = await supabase.from("purchases").upsert(
    {
      user_id: userId,
      package_id: event.product_id,
      package_name: product.name,
      credits: product.credits,
      amount_cents: amountCents,
      currency: "usd",
      provider: "apple_iap",
      provider_transaction_id: `rc_${event.id}`,
    },
    { onConflict: "provider_transaction_id", ignoreDuplicates: true }
  );
  if (purchaseError) {
    console.error("Failed to record IAP purchase:", purchaseError);
    return NextResponse.json(
      { error: "Failed to record purchase" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
