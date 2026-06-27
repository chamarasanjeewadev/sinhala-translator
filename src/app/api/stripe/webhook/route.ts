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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (!userId || !credits) {
      console.error("Missing metadata in checkout session:", session.id);
      return NextResponse.json({ received: true });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("add_credits", {
      p_user_id: userId,
      p_amount: credits,
      p_stripe_session_id: session.id,
      p_description: `Purchased ${credits} credits`,
    });

    if (error) {
      console.error("Failed to add credits:", error);
      return NextResponse.json(
        { error: "Failed to add credits" },
        { status: 500 }
      );
    }

    if (!data?.success) {
      console.error("add_credits RPC failed:", data?.error_message);
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
