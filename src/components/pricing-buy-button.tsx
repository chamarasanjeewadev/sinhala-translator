"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath } from "@/lib/i18n/utils";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type PricingBuyButtonProps = {
  packageId: string;
  label: string;
  className: string;
};

/**
 * Buy button for the landing-page pricing cards. Mirrors the checkout flow on
 * the /pricing page: signed-in users go straight to Stripe checkout, everyone
 * else is sent to signup with the chosen package so checkout resumes afterward.
 */
export function PricingBuyButton({ packageId, label, className }: PricingBuyButtonProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const d = dict.pricing;
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoaded(true);
    });
  }, []);

  const stripeErrors = dict.stripeErrors as Record<string, string> | undefined;

  const stripeErrorText = (errorKey?: string, errorCode?: string, fallback?: string) => {
    const message = (errorKey && stripeErrors?.[errorKey]) || fallback;
    if (!message) return null;
    const codeNote =
      errorCode && stripeErrors?.errorCode
        ? ` (${stripeErrors.errorCode.replace("{code}", errorCode)})`
        : "";
    return `${message}${codeNote}`;
  };

  const handleBuy = async () => {
    if (!user) {
      window.location.href = localePath("/signup", locale) + `?package=${packageId}`;
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, locale }),
      });
      const data: { url?: string; error?: string; errorKey?: string; errorCode?: string } =
        await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(
          stripeErrorText(data.errorKey, data.errorCode, data.error) || d.checkoutError,
          { duration: 12000 }
        );
      }
    } catch {
      toast.error(d.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBuy}
      disabled={loading || !authLoaded}
      className={`${className} disabled:opacity-60`}
    >
      {loading ? d.redirecting : label}
    </button>
  );
}
