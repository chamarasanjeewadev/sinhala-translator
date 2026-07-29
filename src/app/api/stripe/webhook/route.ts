import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createStripeClient, createSubtleCryptoProvider } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { CREDIT_PACKAGES } from "@/lib/constants";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const stripe = createStripeClient();
  const cryptoProvider = createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Visibility into declines: log enough to spot patterns (which decline
  // codes, card countries/brands) in Workers logs. NOTE: this event must also
  // be enabled on the webhook endpoint in the Stripe Dashboard to fire.
  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const err = intent.last_payment_error;
    const card =
      err?.payment_method?.type === "card"
        ? err.payment_method.card
        : undefined;
    console.error("Payment failed:", {
      payment_intent: intent.id,
      code: err?.code ?? null,
      decline_code: err?.decline_code ?? null,
      card_country: card?.country ?? null,
      card_brand: card?.brand ?? null,
      amount: intent.amount,
      currency: intent.currency,
      user_id: intent.metadata?.user_id ?? null,
    });
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (!userId || !credits) {
      console.error("Missing metadata in checkout session:", session.id);
      return NextResponse.json({ received: true });
    }

    const supabase = createAdminClient();

    // A 100%-off promo code makes the checkout $0, which Stripe can't limit to
    // once-per-customer (no payment record to anchor on). So detect the promo
    // code + free total and let the DB grant a FREE promo's credits at most once
    // per (user, code). Paid discounted purchases are unaffected.
    const discount = session.discounts?.[0];
    const promotionCode =
      typeof discount?.promotion_code === "string"
        ? discount.promotion_code
        : discount?.promotion_code?.id ?? null;
    const isFree = (session.amount_total ?? 0) === 0;

    const { data, error } = await supabase.rpc("add_credits_stripe", {
      p_user_id: userId,
      p_amount: credits,
      p_session_id: session.id,
      p_description: `Purchased ${credits} credits`,
      p_promotion_code: promotionCode,
      p_is_free: isFree,
    });

    if (error) {
      console.error("Failed to add credits:", error);
      return NextResponse.json(
        { error: "Failed to add credits" },
        { status: 500 }
      );
    }

    // Repeat use of a free promo code by the same user — checkout completed in
    // Stripe but we grant nothing and skip the purchase record.
    if (data?.granted === false) {
      console.warn(
        `Blocked repeat free promo ${promotionCode} for user ${userId} (session ${session.id})`
      );
      return NextResponse.json({ received: true, skipped: "free_promo_already_used" });
    }

    if (!data?.add_credits?.success) {
      console.error("add_credits RPC failed:", data?.add_credits?.error_message);
    }

    // Accounting record (money side; credit_transactions only logs credits).
    // Runs after the credit grant so bookkeeping failures never block it; a
    // 500 here makes Stripe retry, which is safe — add_credits is idempotent
    // on the session id and this upsert ignores duplicates.
    const pkg = CREDIT_PACKAGES.find(
      (p) => p.id === session.metadata?.package_id
    );
    const { error: purchaseError } = await supabase.from("purchases").upsert(
      {
        user_id: userId,
        package_id: session.metadata?.package_id ?? null,
        package_name: pkg?.name ?? null,
        credits,
        amount_cents: session.amount_total ?? pkg?.price ?? 0,
        currency: session.currency ?? "usd",
        provider: "stripe",
        provider_transaction_id: session.id,
      },
      { onConflict: "provider_transaction_id", ignoreDuplicates: true }
    );
    if (purchaseError) {
      console.error("Failed to record purchase:", purchaseError);
      return NextResponse.json(
        { error: "Failed to record purchase" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
