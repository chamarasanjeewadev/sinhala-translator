import Stripe from "stripe";

export function createStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-01-28.clover",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function createSubtleCryptoProvider() {
  return Stripe.createSubtleCryptoProvider();
}
