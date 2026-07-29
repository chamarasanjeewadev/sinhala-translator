import type Stripe from "stripe";
import { createClientFromRequest } from "@/lib/supabase/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { privateJson } from "@/lib/api-response";
import { createStripeClient } from "@/lib/stripe";
import { describeStripeError } from "@/lib/stripe-errors";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/utils";

/**
 * Return the user's persistent Stripe Customer, creating (and caching on the
 * profile) one if needed. Reusing a single customer across purchases is what
 * makes the LAW26 "first-time transaction" promo restriction work — a fresh
 * guest customer per checkout would look new every time — and gives Stripe
 * Radar a stable purchase history so legit repeat buyers aren't flagged.
 *
 * Returns null if the profiles.stripe_customer_id column isn't present yet (the
 * July 2026 migration hasn't been run). The caller then falls back to the old
 * customer_email flow, so this ships safely regardless of deploy/migrate order.
 */
async function getOrCreateStripeCustomer(
  stripe: Stripe,
  user: { id: string; email?: string }
): Promise<string | null> {
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  // Column missing (migration pending) or read failed — degrade gracefully.
  if (error) {
    console.warn("stripe_customer_id lookup failed, using guest customer:", error.message);
    return null;
  }

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { supabase_user_id: user.id },
  });

  const { error: updateError } = await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", user.id);

  // If we can't persist it (column missing), don't reuse an id we'll forget —
  // fall back so we never orphan customers or block checkout.
  if (updateError) {
    console.warn("Could not persist stripe_customer_id:", updateError.message);
    return null;
  }

  return customer.id;
}

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

    // Reuse one Stripe customer per user so the LAW26 first-time-transaction
    // restriction can tell repeat buyers from new ones (and Radar sees history).
    const customerId = await getOrCreateStripeCustomer(stripe, user);

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
      // Accept any active Stripe promotion code the customer enters, on every
      // pack. NOTE: because line items use inline price_data (not catalog
      // Products), Stripe can't scope a coupon to specific packs — a code
      // applies to whatever pack is being bought. Control exposure via the
      // coupon's own limits in Stripe (percent/amount, max_redemptions,
      // redeem_by, first-time-customer). For per-pack targeting, migrate to
      // Stripe Product/Price objects (see PROMO-ADMIN.md).
      allow_promotion_codes: true,
      // Reused customer when available (enables the first-time-transaction
      // promo restriction); else fall back to a guest customer by email.
      ...(customerId
        ? { customer: customerId, customer_update: { address: "auto", name: "auto" } }
        : { customer_email: user.email }),
      // Collect billing address so Radar can run AVS/postal-code checks —
      // verified addresses cut false declines and let issuers approve the card.
      billing_address_collection: "required",
      // Phone gives issuers/Radar one more verification signal (and syncs to
      // the customer record) — every extra matched field lowers decline risk.
      phone_number_collection: { enabled: true },
      payment_intent_data: {
        ...(user.email ? { receipt_email: user.email } : {}),
        // Appended to the account statement descriptor so the charge is
        // recognizable on bank statements; unrecognized charges feed issuer
        // risk scoring and disputes. (statement_descriptor itself is not
        // allowed for card charges on current API versions — suffix only.)
        statement_descriptor_suffix: "HELAVOICE",
        // Session metadata doesn't propagate to the PaymentIntent; the
        // payment_intent.payment_failed webhook needs user_id here.
        metadata: { user_id: user.id, package_id: creditPackage.id },
      },
      // Deliberately "automatic" (Stripe/issuer decide when to run 3DS) — we
      // chose not to force OTP on every payment. If do_not_honor declines from
      // LK banks persist, flipping this to "any" is the strongest lever: many
      // local issuers approve cross-border USD payments only after 3DS.
      payment_method_options: {
        card: { request_three_d_secure: "automatic" },
      },
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
