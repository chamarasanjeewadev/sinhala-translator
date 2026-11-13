import Stripe from "stripe";
import { privateJson } from "@/lib/api-response";
import { createStripeClient } from "@/lib/stripe";
import { describePaymentError } from "@/lib/stripe-errors";

// Looks up why a Checkout payment failed so the return page can show the
// customer a clear reason. The session id is an unguessable capability
// token (mobile checkouts return in a browser with no auth session), so no
// Bearer auth — the response carries only the payment status and a
// customer-safe failure reason, never account details.

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");

  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
    return privateJson({ error: "Invalid session id" }, { status: 400 });
  }

  try {
    const stripe = createStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
    const lastError = paymentIntent?.last_payment_error;

    // Amount and pack feed the GA4 purchase event on the success page.
    const purchase = {
      amountTotal: session.amount_total,
      currency: session.currency,
      packageId: session.metadata?.package_id ?? null,
    };

    if (!lastError) {
      return privateJson({ status: session.payment_status, errorKey: null, ...purchase });
    }

    const info = describePaymentError(lastError.code, lastError.decline_code);
    return privateJson({
      status: session.payment_status,
      ...purchase,
      errorKey: info.key,
      errorCode: info.code,
      message: info.message,
    });
  } catch (error) {
    console.error("Stripe session-status error:", error);
    return privateJson(
      { error: "Unable to look up payment status" },
      { status: 500 }
    );
  }
}
