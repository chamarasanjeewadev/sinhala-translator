"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CREDIT_PACKAGES, FREE_CREDITS } from "@/lib/constants";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath } from "@/lib/i18n/utils";
import { toast } from "sonner";
import { Check, Zap, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function PricingContent() {
  const searchParams = useSearchParams();
  const dict = useDictionary();
  const locale = useLocale();
  const d = dict.pricing;
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("payment") === "cancelled") {
      toast.info(d.paymentCancelled);
    }
  }, [searchParams, d.paymentCancelled]);

  const handleBuy = async (packageId: string) => {
    setLoadingId(packageId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, locale }),
      });
      const data: { url?: string; error?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || d.checkoutError);
      }
    } catch {
      alert(d.genericError);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(155deg,#07000f_0%,#0d0020_50%,#130030_100%)] text-white">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed -right-20 -top-20 h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.18)_0%,transparent_60%)]" />
      <div className="pointer-events-none fixed bottom-0 left-0 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(52,0,117,0.14)_0%,transparent_65%)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-12">

        {/* ── Hero header ─────────────────────────────────────────────── */}
        <div className="mb-20 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/12 px-3.5 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
              Transparent Pricing
            </span>
          </div>

          <h1 className="font-display mb-5 text-[clamp(2.2rem,5vw,3.8rem)] font-black leading-[1.05] tracking-tight">
            Simple,{" "}
            <span
              style={{
                background: "linear-gradient(130deg,#b78eff 0%,#e879f9 55%,#f9a8d4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              flexible pricing
            </span>
          </h1>
          <p className="mx-auto max-w-[42ch] text-[1.05rem] leading-relaxed text-white/55">
            Buy credits once, use them anytime.{" "}
            <span className="font-medium text-white/80">No subscriptions, no commitments.</span>
          </p>

          {/* Credit model pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              { label: "1 credit = 1 min of audio", color: "violet" },
              { label: `${FREE_CREDITS} free credits on signup`, color: "emerald" },
              { label: "Credits never expire", color: "sky" },
            ].map(({ label, color }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  color === "emerald"
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                    : color === "sky"
                    ? "border-sky-400/25 bg-sky-500/10 text-sky-300"
                    : "border-violet-400/25 bg-violet-500/10 text-violet-200"
                }`}
              >
                <Check className="h-3 w-3" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Pricing grid ────────────────────────────────────────────── */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">

          {/* Free tier */}
          <div className="relative flex flex-col overflow-hidden rounded-[1.35rem] border border-white/8 bg-white/4 p-7 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-white/15 hover:bg-white/6 lg:col-span-1">
            <div className="mb-6">
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-white/40">
                Free
              </div>
              <div className="mb-1 flex items-end gap-1.5">
                <span className="font-display text-5xl font-extrabold text-white">$0</span>
              </div>
              <p className="text-sm text-white/45">Forever free — no card needed</p>
            </div>

            <div className="mb-5 text-center">
              <span className="font-display text-4xl font-black text-white">{FREE_CREDITS}</span>
              <span className="ml-1.5 text-sm text-white/50">credits</span>
              <p className="mt-0.5 text-xs text-white/35">= {FREE_CREDITS} minutes of audio</p>
            </div>

            <ul className="mb-8 flex-1 space-y-2.5">
              {[
                `${FREE_CREDITS} transcription minutes`,
                "All audio formats",
                "Up to 25 MB per file",
                "No credit card required",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-white/70">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href={localePath("/signup", locale)}
              className="block w-full rounded-2xl border border-white/12 bg-white/8 py-3 text-center text-sm font-bold text-white/80 transition-all hover:bg-white/14 hover:text-white"
            >
              Get started free
            </Link>
          </div>

          {/* Paid packages */}
          {CREDIT_PACKAGES.map((pkg) => {
            const isPopular = pkg.popular;
            const pricePerCredit = (pkg.price / 100 / pkg.credits).toFixed(3);
            const minutes = pkg.credits;
            const isLoading = loadingId === pkg.id;

            const features = [
              `${minutes} transcription minutes`,
              "All audio formats",
              "Up to 25 MB per file",
              ...(isPopular ? ["Best $/credit value", "Priority processing"] : []),
            ];

            if (isPopular) {
              return (
                <div
                  key={pkg.id}
                  className="relative flex flex-col overflow-hidden rounded-[1.35rem] p-7 shadow-[0_24px_60px_rgba(124,58,237,0.35)] lg:col-span-1 lg:scale-[1.04]"
                  style={{
                    background: "linear-gradient(145deg,#4c0095 0%,#7c3aed 100%)",
                  }}
                >
                  {/* Shimmer overlay */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[1.35rem]"
                    style={{
                      background:
                        "linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 60%)",
                    }}
                  />

                  {/* Popular badge */}
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#340075] shadow-lg">
                      <Zap className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>

                  <div className="relative mb-6 mt-3">
                    <div className="mb-1 text-xs font-bold uppercase tracking-widest text-white/60">
                      {pkg.name}
                    </div>
                    <div className="mb-1 flex items-end gap-1.5">
                      <span className="font-display text-5xl font-extrabold text-white">
                        {pkg.priceDisplay}
                      </span>
                      <span className="mb-1.5 text-sm font-semibold text-white/50">one-time</span>
                    </div>
                    <p className="text-sm text-white/50">
                      ${pricePerCredit} per credit · {minutes} minutes
                    </p>
                  </div>

                  <ul className="relative mb-8 flex-1 space-y-2.5">
                    {features.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-white/85">
                        <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white/70" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleBuy(pkg.id)}
                    disabled={isLoading}
                    className="relative block w-full rounded-2xl bg-white py-3.5 text-center text-sm font-black text-[#340075] shadow-[0_4px_16px_rgba(255,255,255,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#f0f3ff] hover:shadow-[0_8px_24px_rgba(255,255,255,0.35)] disabled:opacity-60"
                  >
                    {isLoading ? "Redirecting…" : `Buy ${pkg.priceDisplay}`}
                  </button>
                </div>
              );
            }

            return (
              <div
                key={pkg.id}
                className="relative flex flex-col overflow-hidden rounded-[1.35rem] border border-white/8 bg-white/4 p-7 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-white/15 hover:bg-white/6 lg:col-span-1"
              >
                <div className="mb-6">
                  <div className="mb-1 text-xs font-bold uppercase tracking-widest text-white/40">
                    {pkg.name}
                  </div>
                  <div className="mb-1 flex items-end gap-1.5">
                    <span className="font-display text-5xl font-extrabold text-white">
                      {pkg.priceDisplay}
                    </span>
                    <span className="mb-1.5 text-sm font-semibold text-white/40">one-time</span>
                  </div>
                  <p className="text-sm text-white/40">
                    ${pricePerCredit} per credit · {minutes} minutes
                  </p>
                </div>

                <ul className="mb-8 flex-1 space-y-2.5">
                  {features.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-white/60">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleBuy(pkg.id)}
                  disabled={isLoading}
                  className="block w-full rounded-2xl border border-white/12 bg-white/8 py-3 text-center text-sm font-bold text-white/80 transition-all hover:bg-white/14 hover:text-white disabled:opacity-60"
                >
                  {isLoading ? "Redirecting…" : `Buy ${pkg.priceDisplay}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── FAQ / reassurance strip ──────────────────────────────────── */}
        <div className="mt-20 grid gap-5 sm:grid-cols-3">
          {[
            {
              q: "How do credits work?",
              a: "1 credit = 1 minute of audio. Credits are deducted only when a transcription succeeds.",
            },
            {
              q: "Do credits expire?",
              a: "Never. Buy once and use your credits at your own pace — no rushing.",
            },
            {
              q: "Is a credit card required for free?",
              a: `No. Sign up and instantly receive ${FREE_CREDITS} free credits. Card only needed when buying a pack.`,
            },
          ].map(({ q, a }) => (
            <div
              key={q}
              className="rounded-[1.15rem] border border-white/8 bg-white/4 p-6 backdrop-blur-sm"
            >
              <p className="mb-2 text-sm font-bold text-white/85">{q}</p>
              <p className="text-sm leading-relaxed text-white/45">{a}</p>
            </div>
          ))}
        </div>

        {/* ── Bottom CTA ──────────────────────────────────────────────── */}
        <div className="mt-16 text-center">
          <p className="mb-4 text-sm text-white/40">
            Have questions? Contact us at{" "}
            <a
              href="mailto:support@helavoice.lk"
              className="text-violet-300 hover:text-violet-200 transition-colors"
            >
              support@helavoice.lk
            </a>
          </p>
          <Link
            href={localePath("/signup", locale)}
            className="group inline-flex items-center gap-2 rounded-2xl border border-violet-400/25 bg-violet-500/12 px-6 py-3 text-sm font-semibold text-violet-200 transition-all hover:bg-violet-500/20 hover:text-white"
          >
            Start with {FREE_CREDITS} free credits
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
