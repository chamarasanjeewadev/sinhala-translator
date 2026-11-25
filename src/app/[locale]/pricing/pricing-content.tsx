"use client";

import { useSearchParams } from "next/navigation";
import { trackBeginCheckout, trackEvent } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { WHATSAPP_NUMBER_DISPLAY, whatsappLink } from "@/lib/contact";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath, t } from "@/lib/i18n/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ToolCostTable } from "@/components/tool-cost-table";
import { CHUNK_MINUTES } from "@/components/tool-catalog";
import type { User } from "@supabase/supabase-js";

export function PricingContent({
  freeTier,
  freeCredits,
  maxMb,
}: {
  freeTier: boolean;
  freeCredits: number;
  /** Upload cap from app settings, so the page never repeats a stale figure. */
  maxMb: number;
}) {
  const searchParams = useSearchParams();
  const dict = useDictionary();
  const locale = useLocale();
  const d = dict.pricing;
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const autoTriggered = useRef(false);

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

  // Auto-trigger checkout when returning from auth with ?buy=<packageId>
  useEffect(() => {
    const buy = searchParams.get("buy");
    if (buy && authLoaded && user && !autoTriggered.current) {
      autoTriggered.current = true;
      handleBuy(buy);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded, user]);

  useEffect(() => {
    if (searchParams.get("payment") !== "cancelled") return;
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      trackEvent("checkout_cancelled", { reason: "unknown" });
      toast.info(d.paymentCancelled);
      return;
    }
    // Ask Stripe why the payment didn't complete — a declined card deserves
    // a clear reason, not just "cancelled".
    let stale = false;
    fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(sessionId)}`)
      .then(
        (res) =>
          res.json() as Promise<{ errorKey?: string; errorCode?: string; message?: string }>
      )
      .then((data) => {
        if (stale) return;
        // reason = Stripe decline key (e.g. do_not_honor) or "abandoned"
        trackEvent("checkout_cancelled", {
          reason: data.errorKey ?? "abandoned",
          error_code: data.errorCode,
        });
        const message = stripeErrorText(data.errorKey, data.errorCode, data.message);
        if (data.errorKey && message) {
          toast.error(message, { duration: 12000 });
        } else {
          toast.info(d.paymentCancelled);
        }
      })
      .catch(() => {
        if (!stale) toast.info(d.paymentCancelled);
      });
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, d.paymentCancelled]);

  const handleBuy = async (packageId: string) => {
    if (!user) {
      window.location.href = localePath("/signup", locale) + `?package=${packageId}`;
      return;
    }
    setLoadingId(packageId);
    trackBeginCheckout(packageId);
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
      setLoadingId(null);
    }
  };

  const BTN_PRIMARY =
    "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-ink px-3 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-ink-2 active:translate-y-px disabled:opacity-60";
  const BTN_SECONDARY =
    "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-ink/15 bg-white px-3 text-sm font-semibold text-ink transition-[border-color,transform] hover:border-ink/35 active:translate-y-px disabled:opacity-60";
  const l = dict.landing;
  const fill = (s: string, vars: Record<string, string | number>) => t(s, vars);
  const faq = [
    { q: d.faqCreditsQ, a: fill(d.faqCreditsA, { chunkMin: CHUNK_MINUTES }) },
    { q: d.faqExpireQ, a: d.faqExpireA },
    freeTier ? { q: d.faqCardQ, a: fill(d.faqCardA, { count: freeCredits }) } : { q: d.faqSubQ, a: d.faqSubA },
  ];
  const facts = [l.creditsNeverExpire, l.allTools, fill(l.upToMb, { mb: maxMb }), l.allAudioFormats];

  return (
    <div className="text-ink">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-10 max-w-2xl">
          <h1 className="hv-enter font-display text-[clamp(2.2rem,4.6vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.02em]">
            {d.h1}
          </h1>
          <p className="hv-enter mt-4 text-lg leading-relaxed text-ink/70" style={{ ["--d" as string]: ".06s" }}>
            {d.lead}
          </p>
        </div>

        {/* ── Packs ───────────────────────────────────────────────────── */}
        <div className={`hv-enter grid gap-4 sm:grid-cols-2 ${freeTier ? "lg:grid-cols-5" : "lg:grid-cols-4"}`} style={{ ["--d" as string]: ".12s" }}>
          {freeTier && (
            <div className="flex flex-col rounded-2xl border border-ink/10 bg-paper p-6">
              <p className="text-sm font-semibold text-ink/65">{l.freeCardTitle}</p>
              <p className="mt-3 font-display text-4xl font-bold">{freeCredits}</p>
              <p className="text-sm text-ink/65">{l.credits}</p>
              <p className="mt-4 text-sm font-semibold">$0</p>
              <p className="text-sm text-ink/60">{l.freeCardNote}</p>
              <span className="min-h-6 flex-1" />
              <Link href={localePath("/signup", locale)} className={BTN_SECONDARY}>
                {l.startFree}
              </Link>
            </div>
          )}

          {CREDIT_PACKAGES.map((pkg) => {
            const isLoading = loadingId === pkg.id;
            return (
              <div
                key={pkg.id}
                className={`flex flex-col rounded-2xl bg-white p-6 ${pkg.popular ? "border-2 border-ink" : "border border-ink/10"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink/65">{pkg.name}</p>
                  {pkg.popular && (
                    <span className="rounded-md bg-ink px-2 py-1 text-[11px] font-semibold leading-none text-white">{d.mostPopular}</span>
                  )}
                </div>
                <p className="mt-3 font-display text-4xl font-bold">{pkg.credits}</p>
                <p className="text-sm text-ink/65">{l.credits}</p>
                <p className="mt-4 text-sm font-semibold">
                  {pkg.priceDisplay} <span className="font-normal text-ink/55">· {d.oneTime}</span>
                </p>
                <p className="text-sm text-ink/60">{fill(l.perCreditPrice, { price: (pkg.price / 100 / pkg.credits).toFixed(2) })}</p>
                <span className="min-h-6 flex-1" />
                <button
                  type="button"
                  onClick={() => handleBuy(pkg.id)}
                  disabled={isLoading || !authLoaded}
                  className={pkg.popular ? BTN_PRIMARY : BTN_SECONDARY}
                >
                  {isLoading ? d.redirecting : fill(l.buyPack, { count: pkg.credits })}
                </button>
              </div>
            );
          })}
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/65">
          {[...facts, d.promo].map((x: string) => (
            <li key={x} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-leaf" />
              {x.charAt(0).toUpperCase() + x.slice(1)}
            </li>
          ))}
        </ul>

        {/* ── Which tools are free and which use credits ───────────────── */}
        <section id="tools" className="mt-20 scroll-mt-20">
          <h2 className="font-display text-[clamp(1.6rem,3vw,2.25rem)] font-bold leading-[1.1] tracking-tight">{d.toolsTitle}</h2>
          <p className="mb-8 mt-3 max-w-2xl text-lg text-ink/70">{d.toolsLead}</p>
          <ToolCostTable
            locale={locale}
            nav={dict.navbar}
            translateNote={l.toolsTranslateNote}
            siEnLabel={l.toolsSiEn}
          />
        </section>

        {/* ── Questions ───────────────────────────────────────────────── */}
        <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-[clamp(1.6rem,3vw,2.25rem)] font-bold leading-[1.1] tracking-tight">{d.faqTitle}</h2>
          <dl className="divide-y divide-ink/10 border-y border-ink/10">
            {faq.map(({ q, a }) => (
              <div key={q} className="py-5">
                <dt className="font-semibold">{q}</dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-ink/70">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Contact + start ─────────────────────────────────────────── */}
        <div className="mt-16 flex flex-col gap-6 rounded-2xl bg-ink p-8 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-xl text-white/75">
            {d.contactLead}{" "}
            <a href="mailto:hi@helavoice.lk" className="font-semibold text-white underline underline-offset-4">
              hi@helavoice.lk
            </a>{" "}
            {d.contactOr}{" "}
            <a href={whatsappLink()} target="_blank" rel="noopener" className="whitespace-nowrap font-semibold text-white underline underline-offset-4">
              {WHATSAPP_NUMBER_DISPLAY}
            </a>
          </p>
          <Link
            href={localePath("/signup", locale)}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-6 text-[15px] font-semibold text-ink transition-[background-color,transform] hover:bg-mint active:translate-y-px"
          >
            {freeTier ? fill(d.startFreeCount, { count: freeCredits }) : d.startPaid}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
