import { createClientFromRequest } from "@/lib/supabase/request";
import { privateJson } from "@/lib/api-response";
import { createStripeClient } from "@/lib/stripe";
import { describeStripeError } from "@/lib/stripe-errors";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/utils";

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { packageId: string; locale?: string; platform?: string };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const { packageId } = body;
  const isMobile = body.platform === "mobile";
  const locale: Locale =
    body.locale && locales.includes(body.locale as Locale)
      ? (body.locale as Locale)
      : defaultLocale;
  const creditPackage = CREDIT_PACKAGES.find((p) => p.id === packageId);

  if (!creditPackage) {
    return privateJson(
      { error: "Invalid package selected" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const stripe = createStripeClient();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${creditPackage.credits} Transcription Credits`,
              description: `${creditPackage.name} pack — ${creditPackage.credits} credits for Sinhala audio transcription`,
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // Promo codes only offered on the Starter pack — inline price_data can't
      // be coupon-restricted to a product, so we gate it here instead.
      allow_promotion_codes: creditPackage.id === "pack_10",
      customer_email: user.email,
      payment_intent_data: user.email
        ? { receipt_email: user.email }
        : undefined,
      // session_id on the cancel URL lets the return page look up why the
      // payment failed (declined card vs. user simply backing out).
      success_url: isMobile
        ? `${appUrl}/payment-complete?status=success`
        : `${appUrl}${localePath("/dashboard", locale)}?payment=success`,
      cancel_url: isMobile
        ? `${appUrl}/payment-complete?status=cancelled&session_id={CHECKOUT_SESSION_ID}`
        : `${appUrl}${localePath("/pricing", locale)}?payment=cancelled&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        user_id: user.id,
        package_id: creditPackage.id,
        credits: creditPackage.credits.toString(),
      },
    });

    return privateJson({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    const { info, status } = describeStripeError(error);
    return privateJson(
      { error: info.message, errorKey: info.key, errorCode: info.code },
      { status }
    );
  }
}
