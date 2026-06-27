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

    if (!lastError) {
      return privateJson({ status: session.payment_status, errorKey: null });
    }

    const info = describePaymentError(lastError.code, lastError.decline_code);
    return privateJson({
      status: session.payment_status,
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
