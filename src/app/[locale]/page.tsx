import {
  Mic,
  AudioWaveform,
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
import { CREDIT_PACKAGES, FREE_CREDITS } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { localePath, t, generateAlternates } from "@/lib/i18n/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LandingHero } from "@/components/landing-hero";
import { HowItWorks } from "@/components/how-it-works";

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
    alternateName: "Sinhala Voice Transcriber",
    url: siteUrl,
    description: d.heroSubtitle,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "si"],
    featureList: [
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
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: `${FREE_CREDITS} free minutes on signup — no credit card required`,
      },
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
    <div className="min-h-screen bg-[#07000f] text-white">
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
        freeCreditsLabel={t(d.freeCredits, { count: FREE_CREDITS })}
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
      <section className="relative overflow-hidden bg-[#0d0020] px-6 py-24 sm:py-28 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(124,58,237,.35)_35%,rgba(232,121,249,.3)_65%,transparent)]" />
        <div className="pointer-events-none absolute -bottom-24 left-[8%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(76,0,149,0.22)_0%,transparent_65%)]" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            {/* Left: narrative + differentiated proof points */}
            <div>
              <div className="flex items-center gap-3">
                <span className="flow-line h-px w-8 rounded-full" />
                <span className="section-eyebrow text-violet-300">
                  {d.demoEyebrow}
                </span>
              </div>
              <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-black leading-[1.08] tracking-tight text-white">
                {d.demoTitle1} {d.demoTitle2}
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-[#a99fc4]">
                {d.demoDesc}
              </p>

              <div className="mt-9 space-y-3">
                {demoHighlights.map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="dark-card flex items-start gap-4 rounded-2xl p-5"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/12">
                      <Icon className="h-5 w-5 text-violet-200" />
                    </span>
                    <div>
                      <h3 className="font-sans font-bold text-white">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#a99fc4]">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: live-recording showcase card */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[#1a0038] to-[#2a0055] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
                <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#7c3aed]/20 blur-[80px]" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-[60px]" />

                <div className="relative z-10 mb-8 flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-60" />
                    <span className="relative h-3 w-3 rounded-full bg-red-400" />
                  </span>
                  <span className="text-sm font-semibold text-white/90">
                    {d.recording}
                  </span>
                  <span className="section-eyebrow ml-auto text-white/25">
                    AI
                  </span>
                </div>

                <div className="relative z-10 mb-6 rounded-xl border border-white/8 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="flex h-16 items-end gap-0.5">
                    {waveformBars.map((bar, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full bg-gradient-to-t from-violet-400/60 to-fuchsia-300/90"
                        style={{
                          height: `${bar.height}%`,
                          animation: `pulse ${bar.duration}s ease-in-out infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="relative z-10 rounded-xl border border-white/8 bg-white/5 p-4 backdrop-blur-sm">
                  <p
                    className="text-sm leading-relaxed text-white/90"
                    style={{ fontFamily: "var(--font-noto-sinhala)" }}
                  >
                    {d.demoTranscript}
                  </p>
                </div>
              </div>

              <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-full border border-white/10 bg-[#0d0020]/90 px-4 py-2 backdrop-blur">
                <Zap className="h-4 w-4 text-fuchsia-300" />
                <span className="text-xs font-bold text-white">
                  {d.lightningFast}
                </span>
              </div>
              <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-full border border-white/10 bg-[#0d0020]/90 px-4 py-2 backdrop-blur">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  {d.sinhalaOptimized}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capabilities grid ─────────────────────────────────────────── */}
      <section id="features" className="relative bg-[#07000f] px-6 py-24 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Split header: title left, subtitle right */}
          <div className="grid gap-6 border-b border-white/8 pb-12 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-16">
            <div>
              <div className="flex items-center gap-3">
                <span className="flow-line h-px w-8 rounded-full" />
                <span className="section-eyebrow text-violet-300">
                  {d.featuresEyebrow}
                </span>
              </div>
              <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-black leading-[1.08] tracking-tight text-white">
                {d.featuresTitle1}{" "}
                <span className="hero-gradient-text">{d.featuresTitle2}</span>
              </h2>
            </div>
            <p className="max-w-md text-base leading-relaxed text-[#a99fc4] lg:pb-2">
              {d.featuresSubtitle}
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="dark-card group rounded-2xl p-7"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 transition-colors group-hover:bg-violet-500/20">
                  <feature.icon className="h-5 w-5 text-violet-200" />
                </div>
                <h3 className="mt-6 font-sans text-lg font-bold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#a99fc4]">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      {faqItems.length > 0 ? (
        <section id="faq" className="relative bg-[#0b0018] px-6 py-24 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <div className="mb-5 flex items-center justify-center gap-3">
                <span className="flow-line h-px w-8 rounded-full" />
                <span className="section-eyebrow text-violet-300">
                  {d.faqEyebrow}
                </span>
                <span className="flow-line h-px w-8 rounded-full" />
              </div>
              <h2 className="font-display text-[clamp(1.9rem,3.6vw,3rem)] font-black leading-[1.08] tracking-tight text-white">
                {d.faqTitle1} {d.faqTitle2}
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#a99fc4]">
                {d.faqSubtitle}
              </p>
            </div>

            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <details
                  key={index}
                  className="dark-card group rounded-2xl [&[open]]:border-violet-400/30"
                >
                  <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
                    <h3 className="font-sans text-base font-semibold text-white lg:text-lg">
                      {item.q}
                    </h3>
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-violet-300 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="-mt-1 px-6 pb-6">
                    <p className="text-sm leading-relaxed text-[#a99fc4] lg:text-base">
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
      <section id="credits" className="bg-[#f4f2fb] px-6 py-24 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="mb-5 flex items-center justify-center gap-3">
              <span className="h-px w-8 rounded-full bg-[#340075]/30" />
              <span className="section-eyebrow text-[#340075]">
                {d.pricingEyebrow}
              </span>
              <span className="h-px w-8 rounded-full bg-[#340075]/30" />
            </div>
            <h2 className="font-display text-[clamp(1.9rem,3.6vw,3rem)] font-black leading-[1.08] tracking-tight text-[#111c2d]">
              {d.pricingTitle1} {d.pricingTitle2}
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a4452]">
              {d.pricingSubtitle}
            </p>
          </div>

          {/* Credit model summary */}
          <div className="mx-auto mb-14 max-w-3xl">
            <div className="rounded-2xl border border-[#e2ddf2] bg-white p-8 shadow-[0_12px_40px_rgba(52,0,117,0.08)]">
              <div className="grid divide-y divide-[#eee9fb] md:grid-cols-3 md:divide-x md:divide-y-0">
                <div className="pt-4 text-center md:pt-0">
                  <div className="font-display text-4xl font-extrabold text-[#340075]">
                    {d.oneCredit}
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#4a4452]">
                    {d.oneTranscription}
                  </div>
                </div>
                <div className="pt-6 text-center md:pt-0">
                  <div className="font-display text-4xl font-extrabold text-[#340075]">
                    {FREE_CREDITS}
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#4a4452]">
                    {d.freeCreditsOnSignup}
                  </div>
                </div>
                <div className="pt-6 text-center md:pt-0">
                  <div className="font-display text-4xl font-extrabold text-[#047857]">
                    &infin;
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#4a4452]">
                    {d.creditsNeverExpire}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing cards */}
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                    className="relative rounded-2xl bg-gradient-to-br from-[#340075] to-[#4c1d95] p-7 shadow-[0_24px_60px_rgba(52,0,117,0.25)] lg:scale-105"
                  >
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 shadow-[0_4px_12px_rgba(17,28,45,0.12)]">
                      <span className="section-eyebrow text-[#340075]">
                        {d.mostPopular}
                      </span>
                    </div>

                    <div className="mb-7 mt-2">
                      <div className="section-eyebrow mb-3 text-white/60">
                        {pkg.name}
                      </div>
                      <div className="mb-3 flex items-end gap-2">
                        <span className="font-display text-5xl font-extrabold text-white">
                          {pkg.credits}
                        </span>
                        <span className="mb-2 text-base font-semibold text-white/60">
                          {d.credits}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-white/60">
                        {pkg.priceDisplay}{" "}
                        <span className="text-white/40">
                          &middot; {t(d.perCredit, { price: pricePerCredit })}
                        </span>
                      </div>
                    </div>

                    <ul className="mb-8 space-y-3">
                      {tierFeatures.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm text-white/90"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/70" />
                          <span className="font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={lp("/signup")}
                      className="focus-ring block w-full rounded-full bg-white px-5 py-3.5 text-center text-sm font-bold text-[#340075] shadow-[0_4px_16px_rgba(255,255,255,0.3)] transition-all hover:bg-[#f0f3ff]"
                    >
                      {d.getStarted}
                    </Link>
                  </div>
                );
              }

              return (
                <div
                  key={pkg.id}
                  className="rounded-2xl border border-[#e2ddf2] bg-white p-7 shadow-[0_10px_30px_rgba(52,0,117,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(52,0,117,0.12)]"
                >
                  <div className="mb-7">
                    <div className="section-eyebrow mb-3 text-[#4a4452]">
                      {pkg.name}
                    </div>
                    <div className="mb-3 flex items-end gap-2">
                      <span className="font-display text-5xl font-extrabold text-[#111c2d]">
                        {pkg.credits}
                      </span>
                      <span className="mb-2 text-base font-semibold text-[#4a4452]">
                        {d.credits}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-[#4a4452]">
                      {pkg.priceDisplay}{" "}
                      <span className="text-[#4a4452]/60">
                        &middot; {t(d.perCredit, { price: pricePerCredit })}
                      </span>
                    </div>
                  </div>

                  <ul className="mb-8 space-y-3">
                    {tierFeatures.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-[#4a4452]"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#047857]" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={lp("/signup")}
                    className="focus-ring block w-full rounded-full bg-[#340075] px-5 py-3.5 text-center text-sm font-bold text-white transition-all hover:bg-[#4c1d95]"
                  >
                    {d.getStarted}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <p className="mb-4 text-[#4a4452]">{d.needMoreCredits}</p>
            <Link
              href={lp("/pricing")}
              className="focus-ring group inline-flex items-center gap-2 font-bold text-[#340075] transition-colors hover:text-[#4c1d95]"
            >
              {d.viewAllPackages}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#07000f] px-6 py-24 sm:py-28 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(124,58,237,.4)_35%,rgba(232,121,249,.35)_65%,transparent)]" />
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#1a0038] to-[#2a0055] p-14 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:p-20">
            <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-[#7c3aed]/25 blur-[80px]" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[60px]" />

            <div className="relative z-10">
              <span className="section-eyebrow text-violet-300">
                {d.ctaEyebrow}
              </span>
              <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-black leading-[1.05] tracking-tight text-white">
                {d.ctaTitle}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
                {t(d.ctaSubtitle, { count: FREE_CREDITS })}
              </p>
              <Link
                href={lp("/signup")}
                className="hero-primary-button focus-ring mt-10 inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-bold text-white"
              >
                <Mic className="h-[15px] w-[15px]" />
                <span>{d.ctaButton}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-7 text-sm text-white/55">
                {d.guideIntro}{" "}
                <Link
                  href={guidePath}
                  className="font-semibold text-white/90 underline underline-offset-4 transition-colors hover:text-white"
                >
                  {d.guideLink}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 bg-[#07000f] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 grid gap-12 md:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4c0095] to-[#7c3aed] shadow-[0_4px_12px_rgba(124,58,237,0.35)]">
                  <AudioWaveform className="h-4 w-4 text-white" />
                </div>
                <span className="font-display text-lg font-bold text-white">
                  HelaVoice.lk
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[#a99fc4]">
                {d.footerDesc}
              </p>
              <p className="mt-4 text-sm font-medium text-[#a99fc4]">
                {d.footerContact}{" "}
                <a
                  href="mailto:hi@helavoice.lk"
                  className="text-violet-300 transition-colors hover:text-fuchsia-300"
                >
                  hi@helavoice.lk
                </a>
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="section-eyebrow mb-5 text-white/50">
                {d.footerProduct}
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href={lp("/#features")}
                    className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                  >
                    {d.footerFeatures}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/blog")}
                    className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                  >
                    {d.footerBlog}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/pricing")}
                    className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                  >
                    {d.footerPricing}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="section-eyebrow mb-5 text-white/50">
                {d.footerAccount}
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href={lp("/login")}
                    className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                  >
                    {d.footerLogIn}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/signup")}
                    className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                  >
                    {d.footerSignUp}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/dashboard")}
                    className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                  >
                    {d.footerDashboard}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="section-eyebrow mb-5 text-white/50">
                {d.footerLegal}
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href={lp("/privacy")}
                    className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                  >
                    {d.footerPrivacy}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/terms")}
                    className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                  >
                    {d.footerTerms}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 md:flex-row">
            <p className="text-sm font-medium text-[#a99fc4]/70">
              {d.footerCopyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
