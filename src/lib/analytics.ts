"use client";

import { sendGTMEvent } from "@next/third-parties/google";

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return;

  sendGTMEvent({
    event: eventName,
    ...params,
  });
}
