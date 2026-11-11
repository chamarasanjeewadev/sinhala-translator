import {
  Mic,
  Sparkles,
  Download,
  ArrowRight,
  Zap,
  Globe2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Languages,
  Shield,
} from "lucide-react";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { getSignupBonusConfig } from "@/lib/app-settings";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { localePath, t, generateAlternates } from "@/lib/i18n/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LandingHero } from "@/components/landing-hero";
import { HowItWorks } from "@/components/how-it-works";
import { PricingBuyButton } from "@/components/pricing-buy-button";

const waveformBars = [
  { height: 65, duration: 0.7 },
  { height: 40, duration: 0.9 },
  { height: 80, duration: 0.5 },
  { height: 55, duration: 0.8 },
  { height: 90, duration: 0.6 },
  { height: 45, duration: 0.7 },
  { height: 70, duration: 0.9 },
  { height: 85, duration: 0.5 },
  { height: 35, duration: 0.8 },
  { height: 60, duration: 0.6 },
  { height: 75, duration: 0.7 },
  { height: 50, duration: 0.9 },
  { height: 88, duration: 0.5 },
  { height: 42, duration: 0.8 },
  { height: 68, duration: 0.6 },
  { height: 78, duration: 0.7 },
  { height: 55, duration: 0.9 },
  { height: 92, duration: 0.5 },
  { height: 38, duration: 0.8 },
  { height: 72, duration: 0.6 },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);

  return {
    alternates: generateAlternates(locale as Locale, "/"),
    openGraph: {
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
      "sinhala voice typing",
      "sinhala voice transcriber",
      "sinhala speech to text",
      "sinhala audio to text",
      "sinhala transcription",
      "audio to text sinhala",
      "sri lanka transcription",
      "voice note transcription sinhala",
    ],
  };
}

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const dict = await getDictionary(locale as Locale);
  const d = dict.landing;
  const { enabled: freeTier, amount: freeCredits } = await getSignupBonusConfig();

  const features = [
    {
      icon: Clock,
      title: d.featureRealtime,
      desc: d.featureRealtimeDesc,
    },
    {
      icon: Globe2,
      title: d.featureAnywhere,
      desc: d.featureAnywhereDesc,
    },
    {
      icon: Download,
      title: d.featureCopy,
      desc: d.featureCopyDesc,
    },
    {
      icon: Sparkles,
      title: d.featureAI,
      desc: d.featureAIDesc,
    },
    {
      icon: Languages,
      title: d.featureSinhala,
      desc: d.featureSinhalaDesc,
    },
    {
      icon: Mic,
      title: d.featureRecord,
      desc: d.featureRecordDesc,
    },
  ];

  const lp = (path: string) => localePath(path, locale as Locale);
  const guidePath = lp("/blog/how-to-transcribe-sinhala-audio-to-text");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HelaVoice.lk",
    alternateName: ["Sinhala Voice to Text", "Sinhala Voice Transcriber"],
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
      "Per-minute billing",
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
              description: `${freeCredits} free minutes on signup — no credit card required`,
            },
          ]
        : []),
      ...CREDIT_PACKAGES.map((pkg) => ({
        "@type": "Offer",
        name: pkg.name,
        price: (pkg.price / 100).toFixed(2),
        priceCurrency: "USD",
        description: `${pkg.credits} transcription minutes`,
      })),
    ],
  };

  const faqItems = (d.faqItems ?? []) as { q: string; a: string }[];
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

  const demoHighlights = [
    {
      icon: Sparkles,
      title: d.featureAI,
      desc: d.featureAIDesc,
    },
    {
      icon: Download,
      title: d.featureCopy,
      desc: d.featureCopyDesc,
    },
    {
      icon: Shield,
      title: d.featureSecure ?? "Secure & private",
      desc:
        d.featureSecureDesc ??
        "Your audio is processed securely and never stored without your permission.",
    },
  ];

  return (
    <div className="min-h-screen bg-transparent text-ink">
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

      <LandingHero
        locale={locale as Locale}
        copy={{
          badge: d.badge,
          eyebrow: d.heroEyebrow,
          heroTitle1: d.heroTitle1,
          heroSubtitle: d.heroSubtitle,
          startTranscribing: d.startTranscribing,
          viewPricing: d.viewPricing,
          noSubscription: d.noSubscription,
        }}
        freeCreditsLabel={freeTier ? t(d.freeCredits, { count: freeCredits }) : null}
      />

      {/* ── How it works (numbered, arrowed step-by-step) ─────────────── */}
      <HowItWorks
        copy={{
          eyebrow: d.howEyebrow,
          title: d.howTitle,
          subtitle: d.howSubtitle,
          steps: d.howSteps,
        }}
      />

      {/* ── Showcase: built for Sinhala ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-white/40 px-6 py-24 sm:py-28 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(143,208,176,.35)_35%,rgba(244,176,143,.3)_65%,transparent)]" />
        <div className="pointer-events-none absolute -bottom-24 left-[8%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(198,230,240,0.6)_0%,transparent_65%)]" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            {/* Left: narrative + differentiated proof points */}
            <div>
              <div className="flex items-center gap-3">
                <span className="flow-line h-px w-8 rounded-full" />
                <span className="section-eyebrow text-leaf">
                  {d.demoEyebrow}
                </span>
              </div>
              <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-black leading-[1.08] tracking-tight text-ink">
                {d.demoTitle1} {d.demoTitle2}
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-[#8f9a94]">
                {d.demoDesc}
              </p>

              <div className="mt-9 space-y-3">
                {demoHighlights.map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="dark-card flex items-start gap-4 rounded-2xl p-5"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-leaf/25 bg-mint/70">
                      <Icon className="h-5 w-5 text-leaf" />
                    </span>
                    <div>
                      <h3 className="font-sans font-bold text-ink">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#8f9a94]">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: live-recording showcase card */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/55 backdrop-blur-xl p-8 shadow-[0_24px_60px_rgba(21,32,27,0.08)]">
                <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#2f7d5b]/20 blur-[80px]" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-peach/70 blur-[60px]" />

                <div className="relative z-10 mb-8 flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-60" />
                    <span className="relative h-3 w-3 rounded-full bg-red-400" />
                  </span>
                  <span className="text-sm font-semibold text-ink/95">
                    {d.recording}
                  </span>
                  <span className="section-eyebrow ml-auto text-ink/55">
                    AI
                  </span>
                </div>

                <div className="relative z-10 mb-6 rounded-xl border border-ink/10 bg-white/60 p-5 backdrop-blur-sm">
                  <div className="flex h-16 items-end gap-0.5">
                    {waveformBars.map((bar, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full bg-gradient-to-t from-leaf/60 to-ember/90"
                        style={{
                          height: `${bar.height}%`,
                          animation: `pulse ${bar.duration}s ease-in-out infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="relative z-10 rounded-xl border border-ink/10 bg-white/60 p-4 backdrop-blur-sm">
                  <p
                    className="text-sm leading-relaxed text-ink/95"
                    style={{ fontFamily: "var(--font-noto-sinhala)" }}
                  >
                    {d.demoTranscript}
                  </p>
                </div>
              </div>

              <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-full border border-ink/10 bg-white/90 px-4 py-2 backdrop-blur">
                <Zap className="h-4 w-4 text-ember" />
                <span className="text-xs font-bold text-ink">
                  {d.lightningFast}
                </span>
              </div>
              <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-full border border-ink/10 bg-white/90 px-4 py-2 backdrop-blur">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-ink">
                  {d.sinhalaOptimized}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capabilities grid ─────────────────────────────────────────── */}
      <section id="features" className="relative bg-transparent px-6 py-24 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Split header: title left, subtitle right */}
          <div className="grid gap-6 border-b border-ink/10 pb-12 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-16">
            <div>
              <div className="flex items-center gap-3">
                <span className="flow-line h-px w-8 rounded-full" />
                <span className="section-eyebrow text-leaf">
                  {d.featuresEyebrow}
                </span>
              </div>
              <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-black leading-[1.08] tracking-tight text-ink">
                {d.featuresTitle1}{" "}
                <span className="hero-gradient-text">{d.featuresTitle2}</span>
              </h2>
            </div>
            <p className="max-w-md text-base leading-relaxed text-[#8f9a94] lg:pb-2">
              {d.featuresSubtitle}
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="dark-card group rounded-2xl p-7"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-leaf/20 bg-mint/70 transition-colors group-hover:bg-mint/70">
                  <feature.icon className="h-5 w-5 text-leaf" />
                </div>
                <h3 className="mt-6 font-sans text-lg font-bold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#8f9a94]">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      {faqItems.length > 0 ? (
        <section id="faq" className="relative bg-transparent px-6 py-24 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <div className="mb-5 flex items-center justify-center gap-3">
                <span className="flow-line h-px w-8 rounded-full" />
                <span className="section-eyebrow text-leaf">
                  {d.faqEyebrow}
                </span>
                <span className="flow-line h-px w-8 rounded-full" />
              </div>
              <h2 className="font-display text-[clamp(1.9rem,3.6vw,3rem)] font-black leading-[1.08] tracking-tight text-ink">
                {d.faqTitle1} {d.faqTitle2}
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#8f9a94]">
                {d.faqSubtitle}
              </p>
            </div>

            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <details
                  key={index}
                  className="dark-card group rounded-2xl [&[open]]:border-leaf/30"
                >
                  <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
                    <h3 className="font-sans text-base font-semibold text-ink lg:text-lg">
                      {item.q}
                    </h3>
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-leaf transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="-mt-1 px-6 pb-6">
                    <p className="text-sm leading-relaxed text-[#8f9a94] lg:text-base">
                      {item.a}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Pricing (the single warm light band, so prices pop) ───────── */}
      <section id="credits" className="bg-white/40 px-6 py-24 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="mb-5 flex items-center justify-center gap-3">
              <span className="h-px w-8 rounded-full bg-[#15201b]/30" />
              <span className="section-eyebrow text-[#15201b]">
                {d.pricingEyebrow}
              </span>
              <span className="h-px w-8 rounded-full bg-[#15201b]/30" />
            </div>
            <h2 className="font-display text-[clamp(1.9rem,3.6vw,3rem)] font-black leading-[1.08] tracking-tight text-[#15201b]">
              {d.pricingTitle1} {d.pricingTitle2}
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#5b6660]">
              {d.pricingSubtitle}
            </p>
          </div>

          {/* Credit model summary */}
          <div className="mx-auto mb-14 max-w-3xl">
            <div className="rounded-2xl border border-[#dfe7df] bg-white p-8 shadow-[0_12px_40px_rgba(124,195,221,0.08)]">
              <div
                className={`grid divide-y divide-[#eee9fb] ${
                  freeTier ? "md:grid-cols-3" : "md:grid-cols-2"
                } md:divide-x md:divide-y-0`}
              >
                <div className="pt-4 text-center md:pt-0">
                  <div className="font-display text-4xl font-extrabold text-[#15201b]">
                    {d.oneCredit}
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#5b6660]">
                    {d.oneTranscription}
                  </div>
                </div>
                {freeTier && (
                  <div className="pt-6 text-center md:pt-0">
                    <div className="font-display text-4xl font-extrabold text-[#15201b]">
                      {freeCredits}
                    </div>
                    <div className="mt-1 text-sm font-medium text-[#5b6660]">
                      {d.freeCreditsOnSignup}
                    </div>
                  </div>
                )}
                <div className="pt-6 text-center md:pt-0">
                  <div className="font-display text-4xl font-extrabold text-[#047857]">
                    &infin;
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#5b6660]">
                    {d.creditsNeverExpire}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing cards */}
          <div
            className={`mx-auto grid max-w-7xl gap-6 md:grid-cols-2 ${
              freeTier ? "lg:grid-cols-5" : "lg:grid-cols-4"
            }`}
          >
            {/* Free tier — the trial option so new visitors can try before buying.
                Hidden while the free tier is disabled (everyone must purchase). */}
            {freeTier && (
            <div className="flex flex-col rounded-2xl border border-[#dfe7df] bg-white p-7 shadow-[0_10px_30px_rgba(124,195,221,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(124,195,221,0.12)]">
              <div className="mb-7">
                <div className="section-eyebrow mb-3 text-[#5b6660]">
                  {d.freeTier}
                </div>
                <div className="mb-3 flex items-end gap-2">
                  <span className="font-display text-5xl font-extrabold text-[#15201b]">
                    {freeCredits}
                  </span>
                  <span className="mb-2 text-base font-semibold text-[#5b6660]">
                    {d.credits}
                  </span>
                </div>
                <div className="text-sm font-medium text-[#5b6660]">
                  $0{" "}
                  <span className="text-[#5b6660]/60">
                    &middot; {d.freeForever}
                  </span>
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {[
                  t(d.transcriptions, { count: freeCredits }),
                  d.allAudioFormats,
                  d.upTo25MB,
                  d.noCreditCard,
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-[#5b6660]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#047857]" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={lp("/signup")}
                className="focus-ring mt-auto block w-full rounded-full border border-[#15201b]/20 bg-[#15201b]/5 px-5 py-3.5 text-center text-sm font-bold text-[#15201b] transition-all hover:bg-[#15201b]/10"
              >
                {d.startFree}
              </Link>
            </div>
            )}

            {CREDIT_PACKAGES.map((pkg) => {
              const isPopular = pkg.popular;
              const pricePerCredit = (pkg.price / 100 / pkg.credits).toFixed(2);
              const tierFeatures = [
                t(d.transcriptions, { count: pkg.credits }),
                d.allAudioFormats,
                d.upTo25MB,
              ];
              if (isPopular) tierFeatures.push(d.bestValue);

              if (isPopular) {
                return (
                  <div
                    key={pkg.id}
                    className="relative rounded-2xl border border-white/80 bg-gradient-pastel p-7 shadow-[0_24px_60px_rgba(124,195,221,0.35)] lg:scale-105"
                  >
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 shadow-[0_4px_12px_rgba(21,32,27,0.12)]">
                      <span className="section-eyebrow text-[#15201b]">
                        {d.mostPopular}
                      </span>
                    </div>

                    <div className="mb-7 mt-2">
                      <div className="section-eyebrow mb-3 text-ink/65">
                        {pkg.name}
                      </div>
                      <div className="mb-3 flex items-end gap-2">
                        <span className="font-display text-5xl font-extrabold text-ink">
                          {pkg.credits}
                        </span>
                        <span className="mb-2 text-base font-semibold text-ink/65">
                          {d.credits}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-ink/65">
                        {pkg.priceDisplay}{" "}
                        <span className="text-ink/55">
                          &middot; {t(d.perCredit, { price: pricePerCredit })}
                        </span>
                      </div>
                    </div>

                    <ul className="mb-8 space-y-3">
                      {tierFeatures.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm text-ink/95"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink/75" />
                          <span className="font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <PricingBuyButton
                      packageId={pkg.id}
                      label={d.getStarted}
                      className="focus-ring block w-full rounded-full bg-ink px-5 py-3.5 text-center text-sm font-bold text-white shadow-[0_4px_16px_rgba(21,32,27,0.2)] transition-all hover:bg-[#2c3a33]"
                    />
                  </div>
                );
              }

              return (
                <div
                  key={pkg.id}
                  className="rounded-2xl border border-[#dfe7df] bg-white p-7 shadow-[0_10px_30px_rgba(124,195,221,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(124,195,221,0.12)]"
                >
                  <div className="mb-7">
                    <div className="section-eyebrow mb-3 text-[#5b6660]">
                      {pkg.name}
                    </div>
                    <div className="mb-3 flex items-end gap-2">
                      <span className="font-display text-5xl font-extrabold text-[#15201b]">
                        {pkg.credits}
                      </span>
                      <span className="mb-2 text-base font-semibold text-[#5b6660]">
                        {d.credits}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-[#5b6660]">
                      {pkg.priceDisplay}{" "}
                      <span className="text-[#5b6660]/60">
                        &middot; {t(d.perCredit, { price: pricePerCredit })}
                      </span>
                    </div>
                  </div>

                  <ul className="mb-8 space-y-3">
                    {tierFeatures.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-[#5b6660]"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#047857]" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <PricingBuyButton
                    packageId={pkg.id}
                    label={d.getStarted}
                    className="focus-ring block w-full rounded-full bg-[#15201b] px-5 py-3.5 text-center text-sm font-bold text-ink transition-all hover:bg-[#2c3a33]"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <p className="mb-4 text-[#5b6660]">{d.needMoreCredits}</p>
            <Link
              href={lp("/pricing")}
              className="focus-ring group inline-flex items-center gap-2 font-bold text-[#15201b] transition-colors hover:text-[#2c3a33]"
            >
              {d.viewAllPackages}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-transparent px-6 py-24 sm:py-28 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(143,208,176,.4)_35%,rgba(244,176,143,.35)_65%,transparent)]" />
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-gradient-pastel p-14 text-center shadow-[0_24px_80px_rgba(21,32,27,0.08)] lg:p-20">
            <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-[#2f7d5b]/25 blur-[80px]" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-peach/70 blur-[60px]" />

            <div className="relative z-10">
              <span className="section-eyebrow text-leaf">
                {freeTier ? d.ctaEyebrow : d.getStarted}
              </span>
              <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-black leading-[1.05] tracking-tight text-ink">
                {freeTier ? d.ctaTitle : d.ctaTitlePaid}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink/75">
                {freeTier
                  ? t(d.ctaSubtitle, { count: freeCredits })
                  : d.pricingSubtitle}
              </p>
              <Link
                href={lp("/signup")}
                className="hero-primary-button focus-ring mt-10 inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-bold text-white"
              >
                <Mic className="h-[15px] w-[15px]" />
                <span>{freeTier ? d.ctaButton : d.getStarted}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-7 text-sm text-ink/60">
                {d.guideIntro}{" "}
                <Link
                  href={guidePath}
                  className="font-semibold text-ink/95 underline underline-offset-4 transition-colors hover:text-ink"
                >
                  {d.guideLink}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
