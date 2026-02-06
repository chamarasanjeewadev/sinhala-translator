import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/utils";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { packageId: string; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { packageId } = body;
  const locale: Locale =
    body.locale && locales.includes(body.locale as Locale)
      ? (body.locale as Locale)
      : defaultLocale;
  const creditPackage = CREDIT_PACKAGES.find((p) => p.id === packageId);

  if (!creditPackage) {
    return NextResponse.json(
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
      success_url: `${appUrl}${localePath("/dashboard", locale)}?payment=success`,
      cancel_url: `${appUrl}${localePath("/pricing", locale)}?payment=cancelled`,
      metadata: {
        user_id: user.id,
        package_id: creditPackage.id,
        credits: creditPackage.credits.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
