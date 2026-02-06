import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createStripeClient, createSubtleCryptoProvider } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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
  }

  return NextResponse.json({ received: true });
}
