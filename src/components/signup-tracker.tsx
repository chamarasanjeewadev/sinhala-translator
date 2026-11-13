"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/** auth/callback sets hv_signup=<method> for a brand-new account; report it once to GA4. */
export function SignupTracker() {
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)hv_signup=([^;]+)/);
    if (!match) return;
    document.cookie = "hv_signup=; Max-Age=0; Path=/";
    trackEvent("sign_up", { method: decodeURIComponent(match[1]) });
  }, []);
  return null;
}
