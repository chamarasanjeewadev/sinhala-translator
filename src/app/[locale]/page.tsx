import { ArrowRight, Check, ChevronDown, Copy, Download } from "lucide-react";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { getSignupBonusConfig, getAudioUploadLimitMb } from "@/lib/app-settings";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { localePath, t, generateAlternates } from "@/lib/i18n/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PricingBuyButton } from "@/components/pricing-buy-button";
import { ToolCostTable } from "@/components/tool-cost-table";
import { CHUNK_MINUTES } from "@/components/tool-catalog";
import { ogImages } from "@/lib/og-image";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);

  return {
    alternates: generateAlternates(locale as Locale, "/"),
    openGraph: {
      images: ogImages,
      url:
        locale === "en"
          ? "https://helavoice.lk"
          : `https://helavoice.lk/${locale}`,
    },
    title: dict.metadata.title,
    description: dict.metadata.description,
    keywords: [
      "sinhala voice to text",
      "sinhala transcribe",
      "convert sinhala voice to text",
      "sinhala transcript",
      "sinhala voice transcriber",
      "sinhala speech to text",
      "sinhala transcription",
      "sri lanka transcription",
      "voice note transcription sinhala",
    ],
  };
}

type Props = {
  params: Promise<{ locale: string }>;
};

// The product's own screen in the hero: a finished transcript, as the dashboard shows it.
const MOCK_LINES = [
  { at: "0:00", text: "ආයුබෝවන් සියලු දෙනාට." },
  { at: "0:06", text: "අද අපි නව නිෂ්පාදනය ගැන කතා කරමු." },
  { at: "0:14", text: "මේ මාසයේ ඇණවුම් දෙගුණයක් වැඩි වුණා." },
  { at: "0:21", text: "ඊළඟ සතියේ අලුත් ශාඛාවක් විවෘත කරනවා." },
];

const MOCK_SECONDS = 252; // 4:12, billed like a real upload

const WRAP = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";
const H2 = "font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.1] tracking-tight text-ink";
const BTN_PRIMARY =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-ink px-6 text-[15px] font-semibold text-white transition-[background-color,transform] hover:bg-[#2c3a33] active:translate-y-px";
const BTN_SECONDARY =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-6 text-[15px] font-semibold text-ink transition-[border-color,transform] hover:border-ink/35 active:translate-y-px";

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const dict = await getDictionary(locale as Locale);
  const d = dict.landing;
  const [{ enabled: freeTier, amount: freeCredits }, maxMb] = await Promise.all([
    getSignupBonusConfig(),
    getAudioUploadLimitMb(),
  ]);

  const lp = (path: string) => localePath(path, locale as Locale);
  const guidePath = lp("/blog/how-to-transcribe-sinhala-audio-to-text");
  const primaryLabel = freeTier ? d.heroPrimaryFree : d.heroPrimary;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HelaVoice.lk",
    alternateName: ["Sinhala Voice to Text", "Sinhala Speech to Text", "Sinhala Voice Transcriber"],
    url: siteUrl,
    description: d.heroSubtitle,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "si"],
    featureList: [
      "Sinhala voice to text conversion",
      "Sinhala speech-to-text",
      "Audio file upload",
      "Browser-based recording",
      "Sinhala video subtitles",
      "Sinhala text to speech",
      "Pay-as-you-go credits, no subscription",
      "Bilingual UI (English & Sinhala)",
    ],
    audience: {
      "@type": "Audience",
      audienceType:
        "Sri Lankan creators, students, journalists, and businesses",
      geographicArea: { "@type": "Country", name: "Sri Lanka" },
    },
    offers: [
      ...(freeTier
        ? [
            {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: `${freeCredits} free credits on signup (up to ${freeCredits * CHUNK_MINUTES} minutes of transcription), no credit card required`,
            },
          ]
        : []),
      ...CREDIT_PACKAGES.map((pkg) => ({
        "@type": "Offer",
        name: pkg.name,
        price: (pkg.price / 100).toFixed(2),
        priceCurrency: "USD",
        description: `${pkg.credits} credits, up to ${pkg.credits * CHUNK_MINUTES} minutes of transcription`,
      })),
    ],
  };

  // Prices in FAQ answers come from CREDIT_PACKAGES, never from the copy.
  const starter = CREDIT_PACKAGES.reduce((a, b) => (b.price < a.price ? b : a));
  const faqVars = { starterPrice: starter.priceDisplay, starterCredits: starter.credits, chunkMin: CHUNK_MINUTES, maxMb };
  const faqItems = ((d.faqItems ?? []) as { q: string; a: string }[]).map((item) => ({ q: item.q, a: t(item.a, faqVars) }));
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const steps = (d.howSteps as { title: string; desc: string }[])
    .slice(0, 3)
    .map((step) => ({ ...step, desc: t(step.desc, { chunkMin: CHUNK_MINUTES, maxMb }) }));

  return (
    <div className="text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqItems.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      {/* ── Hero: what it is, one fact, the product's own screen ───────── */}
      <section className="flex min-h-[calc(100svh-4rem)] items-center py-14 lg:py-10">
        <div className={`${WRAP} grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16`}>
          <div>
            <h1 className="hv-enter font-display text-[clamp(2.4rem,5.2vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.025em] text-ink">
              {d.h1}
            </h1>
            <p className="hv-enter mt-6 max-w-[34rem] text-lg leading-relaxed text-ink/70" style={{ ["--d" as string]: ".06s" }}>
              {d.heroLead}
            </p>

            <div className="hv-enter mt-9 flex flex-col gap-3 sm:flex-row" style={{ ["--d" as string]: ".12s" }}>
              <Link href={lp("/signup")} className={BTN_PRIMARY}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#tools" className={BTN_SECONDARY}>
                {d.heroSecondary}
              </a>
            </div>

            <ul className="hv-enter mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/70" style={{ ["--d" as string]: ".18s" }}>
              {[freeTier ? t(d.freeCredits, { count: freeCredits }) : null, t(d.heroFactRate, { chunkMin: CHUNK_MINUTES }), d.noSubscription]
                .filter((x): x is string => Boolean(x))
                .map((fact) => (
                  <li key={fact} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-leaf" />
                    {fact}
                  </li>
                ))}
            </ul>
          </div>

          {/* App frame: a finished transcript as it appears in the dashboard */}
          <div className="hv-enter" style={{ ["--d" as string]: ".1s" }} aria-hidden>
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_30px_80px_-30px_rgba(21,32,27,0.35)]">
              <div className="flex items-center gap-3 border-b border-ink/[0.08] px-5 py-3.5">
                <span className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
                </span>
                <span className="font-mono text-[13px] text-ink/70">{d.mockFile}</span>
                <span className="ml-auto font-mono text-[13px] text-ink/50">{Math.floor(MOCK_SECONDS / 60)}:{String(MOCK_SECONDS % 60).padStart(2, "0")}</span>
              </div>

              <div className="flex h-14 items-center gap-[3px] px-5">
                {Array.from({ length: 64 }, (_, i) => (
                  <span
                    key={i}
                    className={`w-full rounded-full ${i < 44 ? "bg-leaf/70" : "bg-ink/15"}`}
                    style={{ height: `${18 + Math.round(Math.abs(Math.sin(i * 1.7) * 26 + Math.sin(i * 0.45) * 14))}%` }}
                  />
                ))}
              </div>

              <ol className="space-y-1 px-3 pb-3">
                {MOCK_LINES.map((line) => (
                  <li key={line.at} className="flex gap-4 rounded-lg px-2 py-2.5 odd:bg-[#f6f8f3]">
                    <span className="w-9 shrink-0 pt-0.5 font-mono text-xs text-ink/45">{line.at}</span>
                    <span className="font-sinhala text-[15px] leading-[1.7] text-ink">{line.text}</span>
                  </li>
                ))}
              </ol>

              <div className="flex flex-wrap items-center gap-2 border-t border-ink/[0.08] bg-[#f6f8f3] px-5 py-3">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1d6b47]">
                  <Check className="h-4 w-4" />
                  {d.mockDone}
                </span>
                <span className="text-[13px] text-ink/55">· {t(d.mockCost, { count: Math.ceil(MOCK_SECONDS / (CHUNK_MINUTES * 60)) })}</span>
                <span className="ml-auto flex gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink/80">
                    <Copy className="h-3.5 w-3.5" />
                    {d.mockCopy}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-ink px-2.5 py-1.5 text-xs font-semibold text-white">
                    <Download className="h-3.5 w-3.5" />
                    {d.mockDownload}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Free vs paid: every tool, what it costs ───────────────────── */}
      <section id="tools" className="scroll-mt-16 bg-white/50 py-20 sm:py-24">
        <div className={WRAP}>
          <div className="mb-10 max-w-2xl">
            <h2 className={H2}>{d.toolsTitle}</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">{d.toolsLead}</p>
          </div>
          <ToolCostTable
            locale={locale as Locale}
            nav={dict.navbar}
            translateNote={d.toolsTranslateNote}
            siEnLabel={d.toolsSiEn}
          />
        </div>
      </section>

      {/* ── How transcription works ───────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-16 py-20 sm:py-24">
        <div className={WRAP}>
          <h2 className={`${H2} max-w-2xl`}>{d.howHeading}</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-ink/10 bg-white p-6">
                <span className="font-mono text-sm font-semibold text-leaf">0{i + 1}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{step.desc}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-ink/65">
            {d.audioPageIntro}{" "}
            <Link href={lp("/sinhala-audio-to-text")} className="font-semibold text-leaf underline underline-offset-4 hover:text-ink">
              {d.audioPageLink}
            </Link>
          </p>
        </div>
      </section>

      {/* ── Credit prices ─────────────────────────────────────────────── */}
      <section id="credits" className="scroll-mt-16 bg-white/50 py-20 sm:py-24">
        <div className={WRAP}>
          <div className="mb-10 max-w-2xl">
            <h2 className={H2}>{d.pricesTitle}</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">{d.pricesLead}</p>
          </div>

          <div className={`grid gap-4 sm:grid-cols-2 ${freeTier ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
            {freeTier && (
              <div className="flex flex-col rounded-2xl border border-ink/10 bg-[#f3f7f2] p-6">
                <p className="text-sm font-semibold text-ink/65">{d.freeCardTitle}</p>
                <p className="mt-3 font-display text-4xl font-bold text-ink">{freeCredits}</p>
                <p className="text-sm text-ink/65">{d.credits}</p>
                <p className="mt-4 text-sm font-semibold text-ink">$0</p>
                <p className="text-sm text-ink/60">{d.freeCardNote}</p>
                <span className="min-h-6 flex-1" />
                <Link href={lp("/signup")} className={`${BTN_SECONDARY} h-11 w-full text-sm`}>
                  {d.startFree}
                </Link>
              </div>
            )}
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col rounded-2xl bg-white p-6 ${pkg.popular ? "border-2 border-ink" : "border border-ink/10"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink/65">{pkg.name}</p>
                  {pkg.popular && (
                    <span className="rounded-md bg-ink px-2 py-1 text-[11px] font-semibold leading-none text-white">{d.mostPopular}</span>
                  )}
                </div>
                <p className="mt-3 font-display text-4xl font-bold text-ink">{pkg.credits}</p>
                <p className="text-sm text-ink/65">{d.credits}</p>
                <p className="mt-4 text-sm font-semibold text-ink">{pkg.priceDisplay}</p>
                <p className="text-sm text-ink/60">{t(d.perCreditPrice, { price: (pkg.price / 100 / pkg.credits).toFixed(2) })}</p>
                <span className="min-h-6 flex-1" />
                <PricingBuyButton
                  packageId={pkg.id}
                  label={t(d.buyPack, { count: pkg.credits })}
                  className={`${(pkg.popular ? BTN_PRIMARY : BTN_SECONDARY).replace("px-6", "px-3")} h-11 w-full whitespace-nowrap text-sm`}
                />
              </div>
            ))}
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/65">
            {[d.creditsNeverExpire, d.allTools, t(d.upToMb, { mb: maxMb }), d.allAudioFormats].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-leaf" />
                {x.charAt(0).toUpperCase() + x.slice(1)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      {faqItems.length > 0 ? (
        <section id="faq" className="scroll-mt-16 py-20 sm:py-24">
          <div className={`${WRAP} grid gap-10 lg:grid-cols-[1fr_2fr]`}>
            <div>
              <h2 className={H2}>{d.faqHeading}</h2>
              <p className="mt-4 text-ink/70">{d.faqSubtitle}</p>
            </div>
            <div className="divide-y divide-ink/10 border-y border-ink/10">
              {faqItems.map((item) => (
                <details key={item.q} className="group">
                  <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 py-5">
                    <h3 className="text-base font-semibold text-ink">{item.q}</h3>
                    <ChevronDown className="h-5 w-5 shrink-0 text-ink/50 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="-mt-1 pb-5 text-[15px] leading-relaxed text-ink/70">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Close ─────────────────────────────────────────────────────── */}
      <section className="bg-ink py-20 text-white sm:py-24">
        <div className={`${WRAP} flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between`}>
          <div className="max-w-2xl">
            <h2 className="font-display text-[clamp(1.9rem,3.6vw,3rem)] font-bold leading-[1.08] tracking-tight">
              {freeTier ? d.closeTitleFree : d.closeTitle}
            </h2>
            <p className="mt-4 text-lg text-white/70">
              {freeTier ? t(d.closeLeadFree, { count: freeCredits }) : d.closeLead}
            </p>
            <p className="mt-6 text-sm text-white/60">
              {d.guideIntro}{" "}
              <Link href={guidePath} className="font-semibold text-white underline underline-offset-4 hover:text-white/80">
                {d.guideLink}
              </Link>
            </p>
          </div>
          <Link
            href={lp("/signup")}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-6 text-[15px] font-semibold text-ink transition-[background-color,transform] hover:bg-[#e3f3e8] active:translate-y-px"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
