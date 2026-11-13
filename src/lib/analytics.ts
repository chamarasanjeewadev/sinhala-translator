"use client";

import { CREDIT_PACKAGES } from "@/lib/constants";

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

type GtagWindow = Window & { dataLayer?: unknown[] };

// GA4 property loaded by the Google tag inside GTM-P85D892K.
const GA4_ID = "G-K39WDNJ11C";

/**
 * Sends a GA4 event. The GTM container (GTM-P85D892K) only forwards
 * qr_code_generated to GA4, so plain dataLayer events were being dropped.
 * A gtag-style command on the shared dataLayer, addressed to the GA4 property
 * with send_to (without it GTM swallows the event), is sent by the Google tag
 * GTM loads, so every event reaches GA4 without GTM changes. Verified 2026-11-13.
 * If GTM ever gets GA4 tags for these event names, they will double count.
 */
export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  w.dataLayer = w.dataLayer || [];
  // gtag.js only processes real Arguments objects, not arrays.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  })("event", eventName, { ...params, send_to: GA4_ID });
}

/** GA4 begin_checkout for a credit pack (list price; promo codes apply later at Stripe). */
export function trackBeginCheckout(packageId: string) {
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  trackEvent("begin_checkout", {
    currency: "USD",
    value: pkg ? pkg.price / 100 : undefined,
    package_id: packageId,
    credits: pkg?.credits,
  });
}
