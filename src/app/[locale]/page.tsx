import {
  Mic,
  AudioWaveform,
  Sparkles,
  Download,
  ArrowRight,
  Zap,
  Globe2,
  CheckCircle2,
  Clock,
  Languages,
  FileAudio,
  Link2,
  Shield,
} from "lucide-react";
import { CREDIT_PACKAGES, FREE_CREDITS } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { localePath, t, generateAlternates } from "@/lib/i18n/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

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
  };
}

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
    "@type": "WebApplication",
    name: "HelaVoice.lk",
    url: siteUrl,
    description: d.heroSubtitle,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "si"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: `${FREE_CREDITS} free credits on signup`,
    },
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-6 lg:px-8 overflow-hidden">
        {/* Ambient background blobs */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#340075]/6 rounded-full blur-[120px]" />
          <div className="absolute top-24 right-0 w-[500px] h-[500px] bg-[#0051d5]/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#340075]/4 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#e7eeff] rounded-full px-5 py-2 mb-10">
              <Sparkles className="w-4 h-4 text-[#340075]" />
              <span className="text-sm font-semibold text-[#340075] font-sans">
                {d.badge}
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl md:text-7xl font-extrabold text-[#111c2d] leading-[1.08] tracking-tight mb-6">
              {d.heroTitle1}
              <br />
              <span className="bg-gradient-to-r from-[#340075] to-[#4c1d95] bg-clip-text text-transparent">
                {d.heroTitle2}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="font-sans text-xl text-[#4a4452] mb-12 leading-relaxed max-w-2xl mx-auto">
              {d.heroSubtitle}
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <Link
                href={lp("/signup")}
                className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#340075] to-[#4c1d95] hover:brightness-110 text-white px-8 py-4 rounded-full font-semibold font-sans text-base transition-all shadow-[0_10px_30px_rgba(52,0,117,0.25)] hover:shadow-[0_14px_36px_rgba(52,0,117,0.35)] hover:-translate-y-0.5"
              >
                <span>{d.startTranscribing}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href={lp("/pricing")}
                className="inline-flex items-center justify-center bg-[#d8e3fb] hover:bg-[#dee8ff] text-[#111c2d] px-8 py-4 rounded-full font-semibold font-sans text-base transition-all hover:-translate-y-0.5"
              >
                {d.viewPricing}
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-[#4a4452]">
              <div className="inline-flex items-center gap-2 bg-[#ffffff] rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(17,28,45,0.06)]">
                <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                <span className="font-medium font-sans">
                  {t(d.freeCredits, { count: FREE_CREDITS })}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-[#ffffff] rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(17,28,45,0.06)]">
                <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                <span className="font-medium font-sans">{d.noSubscription}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-[#ffffff] rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(17,28,45,0.06)]">
                <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                <span className="font-medium font-sans">{d.poweredByGemini}</span>
              </div>
            </div>
          </div>

          {/* Feature icon cards row */}
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { icon: FileAudio, label: "Audio File Upload" },
              { icon: Link2, label: "Meeting Link" },
              { icon: Mic, label: "Record & Share" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-4 bg-[#ffffff] rounded-2xl py-8 px-6 shadow-[0_10px_30px_rgba(17,28,45,0.06)]"
              >
                <div className="w-14 h-14 bg-[#e7eeff] rounded-2xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#340075]" />
                </div>
                <span className="font-sans text-sm font-semibold text-[#111c2d] text-center">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Features Section ───────────────────────────────────────── */}
      <section className="py-28 px-6 lg:px-8 bg-[#f0f3ff]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: feature list */}
            <div className="space-y-10">
              <div>
                <h2 className="font-display text-4xl lg:text-5xl font-bold text-[#111c2d] leading-tight mb-4">
                  {d.demoTitle1}
                  <br />
                  <span className="bg-gradient-to-r from-[#340075] to-[#4c1d95] bg-clip-text text-transparent">
                    {d.demoTitle2}
                  </span>
                </h2>
                <p className="font-sans text-lg text-[#4a4452] leading-relaxed">
                  {d.demoDesc}
                </p>
              </div>

              <div className="space-y-5">
                {[
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
                    title: "Secure & Private",
                    desc: "Your audio data is processed securely and never stored without your permission.",
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="flex gap-5 items-start bg-[#ffffff] rounded-2xl p-5 shadow-[0_10px_30px_rgba(17,28,45,0.06)]"
                  >
                    <div className="w-11 h-11 bg-[#e7eeff] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#340075]" />
                    </div>
                    <div>
                      <h3 className="font-sans font-bold text-[#111c2d] mb-1">
                        {title}
                      </h3>
                      <p className="font-sans text-sm text-[#4a4452] leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: decorative AI card */}
            <div className="relative">
              <div className="rounded-2xl bg-gradient-to-br from-[#340075] to-[#4c1d95] p-8 shadow-[0_24px_60px_rgba(52,0,117,0.22)] overflow-hidden">
                {/* Soft inner glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#0051d5]/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-[60px] pointer-events-none" />

                {/* Recording indicator */}
                <div className="relative z-10 flex items-center gap-2.5 mb-8">
                  <div className="relative w-3 h-3">
                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-60" />
                    <div className="relative w-3 h-3 bg-red-400 rounded-full" />
                  </div>
                  <span className="font-sans text-sm font-semibold text-white/90">
                    {d.recording}
                  </span>
                  <div className="ml-auto">
                    <span className="font-display text-3xl font-black text-white/20 tracking-widest select-none">
                      AI
                    </span>
                  </div>
                </div>

                {/* Waveform visualization */}
                <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-xl p-5 mb-6">
                  <div className="flex items-end gap-0.5 h-16">
                    {waveformBars.map((bar, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-white/50 to-white/90 rounded-full"
                        style={{
                          height: `${bar.height}%`,
                          animation: `pulse ${bar.duration}s ease-in-out infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Demo transcript chip */}
                <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="font-sans text-sm text-white/90 leading-relaxed sinhala-text">
                    {d.demoTranscript}
                  </p>
                </div>
              </div>

              {/* Floating stat chips */}
              <div className="absolute -top-5 -right-5 bg-[#ffffff] rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(17,28,45,0.10)] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#340075]" />
                <span className="font-sans text-xs font-bold text-[#111c2d]">
                  {d.lightningFast}
                </span>
              </div>
              <div className="absolute -bottom-5 -left-5 bg-[#ffffff] rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(17,28,45,0.10)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                <span className="font-sans text-xs font-bold text-[#111c2d]">
                  {d.sinhalaOptimized}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid Section ─────────────────────────────────────── */}
      <section id="features" className="py-28 px-6 lg:px-8 bg-[#f9f9ff]">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-20">
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-[#111c2d] leading-tight mb-5">
              {d.featuresTitle1}
              <br />
              <span className="bg-gradient-to-r from-[#340075] to-[#4c1d95] bg-clip-text text-transparent">
                {d.featuresTitle2}
              </span>
            </h2>
            <p className="font-sans text-lg text-[#4a4452] leading-relaxed">
              {d.featuresSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-[#ffffff] rounded-2xl p-8 shadow-[0_10px_30px_rgba(17,28,45,0.06)] hover:shadow-[0_20px_50px_rgba(17,28,45,0.10)] hover:-translate-y-1 transition-all"
              >
                <div className="w-12 h-12 bg-[#e7eeff] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#d8e3fb] transition-colors">
                  <feature.icon className="w-6 h-6 text-[#340075]" />
                </div>
                <h3 className="font-sans text-lg font-bold text-[#111c2d] mb-3">
                  {feature.title}
                </h3>
                <p className="font-sans text-sm text-[#4a4452] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ───────────────────────────────────────────── */}
      <section id="credits" className="py-28 px-6 lg:px-8 bg-[#f0f3ff]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-[#111c2d] mb-5 leading-tight">
              {d.pricingTitle1}
              <span className="bg-gradient-to-r from-[#340075] to-[#4c1d95] bg-clip-text text-transparent">
                {d.pricingTitle2}
              </span>
            </h2>
            <p className="font-sans text-lg text-[#4a4452] leading-relaxed">
              {d.pricingSubtitle}
            </p>
          </div>

          {/* Credit model summary */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="bg-[#ffffff] rounded-2xl p-8 shadow-[0_10px_30px_rgba(17,28,45,0.06)]">
              <div className="grid md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#e7eeff]">
                <div className="text-center pt-4 md:pt-0">
                  <div className="font-display text-4xl font-extrabold bg-gradient-to-r from-[#340075] to-[#4c1d95] bg-clip-text text-transparent mb-2">
                    {d.oneCredit}
                  </div>
                  <div className="font-sans text-sm text-[#4a4452] font-medium">
                    {d.oneTranscription}
                  </div>
                </div>
                <div className="text-center pt-6 md:pt-0">
                  <div className="font-display text-4xl font-extrabold bg-gradient-to-r from-[#340075] to-[#4c1d95] bg-clip-text text-transparent mb-2">
                    {FREE_CREDITS}
                  </div>
                  <div className="font-sans text-sm text-[#4a4452] font-medium">
                    {d.freeCreditsOnSignup}
                  </div>
                </div>
                <div className="text-center pt-6 md:pt-0">
                  <div className="font-display text-4xl font-extrabold text-[#047857] mb-2">
                    &infin;
                  </div>
                  <div className="font-sans text-sm text-[#4a4452] font-medium">
                    {d.creditsNeverExpire}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
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
                    className="relative bg-gradient-to-br from-[#340075] to-[#4c1d95] rounded-2xl p-7 shadow-[0_24px_60px_rgba(52,0,117,0.25)] lg:scale-105"
                  >
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-1 shadow-[0_4px_12px_rgba(17,28,45,0.12)]">
                      <span className="font-sans text-xs font-black text-[#340075] uppercase tracking-wider">
                        {d.mostPopular}
                      </span>
                    </div>

                    <div className="mb-7 mt-2">
                      <div className="font-sans text-xs font-bold text-white/60 mb-3 uppercase tracking-wider">
                        {pkg.name}
                      </div>
                      <div className="flex items-end gap-2 mb-3">
                        <span className="font-display text-5xl font-extrabold text-white">
                          {pkg.credits}
                        </span>
                        <span className="font-sans text-white/60 mb-2 text-base font-semibold">
                          {d.credits}
                        </span>
                      </div>
                      <div className="font-sans text-sm text-white/60 font-medium">
                        {pkg.priceDisplay}{" "}
                        <span className="text-white/40">
                          &middot; {t(d.perCredit, { price: pricePerCredit })}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {tierFeatures.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 font-sans text-sm text-white/90"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white/70 flex-shrink-0 mt-0.5" />
                          <span className="font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={lp("/signup")}
                      className="block w-full bg-white hover:bg-[#f0f3ff] text-[#340075] px-5 py-3.5 rounded-full font-bold font-sans text-sm transition-all text-center shadow-[0_4px_16px_rgba(255,255,255,0.3)]"
                    >
                      {d.getStarted}
                    </Link>
                  </div>
                );
              }

              return (
                <div
                  key={pkg.id}
                  className="bg-[#ffffff] rounded-2xl p-7 shadow-[0_10px_30px_rgba(17,28,45,0.06)] hover:shadow-[0_20px_50px_rgba(17,28,45,0.10)] hover:-translate-y-1 transition-all"
                >
                  <div className="mb-7">
                    <div className="font-sans text-xs font-bold text-[#4a4452] mb-3 uppercase tracking-wider">
                      {pkg.name}
                    </div>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="font-display text-5xl font-extrabold text-[#111c2d]">
                        {pkg.credits}
                      </span>
                      <span className="font-sans text-[#4a4452] mb-2 text-base font-semibold">
                        {d.credits}
                      </span>
                    </div>
                    <div className="font-sans text-sm text-[#4a4452] font-medium">
                      {pkg.priceDisplay}{" "}
                      <span className="text-[#4a4452]/60">
                        &middot; {t(d.perCredit, { price: pricePerCredit })}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {tierFeatures.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 font-sans text-sm text-[#4a4452]"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#047857] flex-shrink-0 mt-0.5" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={lp("/signup")}
                    className="block w-full bg-[#e7eeff] hover:bg-[#d8e3fb] text-[#111c2d] px-5 py-3.5 rounded-full font-bold font-sans text-sm transition-all text-center"
                  >
                    {d.getStarted}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-14">
            <p className="font-sans text-[#4a4452] mb-4">{d.needMoreCredits}</p>
            <Link
              href={lp("/pricing")}
              className="group inline-flex items-center gap-2 font-sans font-bold text-[#340075] hover:text-[#4c1d95] transition-colors"
            >
              {d.viewAllPackages}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────────────── */}
      <section className="py-28 px-6 lg:px-8 bg-[#f9f9ff]">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-[#340075] to-[#4c1d95] rounded-2xl p-14 lg:p-20 text-center overflow-hidden shadow-[0_24px_80px_rgba(52,0,117,0.25)]">
            {/* Ambient glow inside card */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#0051d5]/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[60px] pointer-events-none" />

            <div className="relative z-10">
              <h2 className="font-display text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
                {d.ctaTitle}
              </h2>
              <p className="font-sans text-lg text-white/75 mb-10 max-w-xl mx-auto leading-relaxed">
                {t(d.ctaSubtitle, { count: FREE_CREDITS })}
              </p>
              <Link
                href={lp("/signup")}
                className="group inline-flex items-center gap-2 bg-white hover:bg-[#f0f3ff] text-[#340075] px-9 py-4 rounded-full font-bold font-sans text-base transition-all shadow-[0_8px_24px_rgba(255,255,255,0.25)] hover:shadow-[0_12px_32px_rgba(255,255,255,0.35)] hover:-translate-y-0.5"
              >
                <span>{d.ctaButton}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="mt-7 font-sans text-sm text-white/60">
                {d.guideIntro}{" "}
                <Link
                  href={guidePath}
                  className="text-white/90 font-semibold underline underline-offset-4 hover:text-white transition-colors"
                >
                  {d.guideLink}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-[#f0f3ff] py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-14">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 bg-gradient-to-br from-[#340075] to-[#4c1d95] rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(52,0,117,0.20)]">
                  <AudioWaveform className="w-4 h-4 text-white" />
                </div>
                <span className="font-display text-lg font-bold text-[#111c2d]">
                  HelaVoice.lk
                </span>
              </div>
              <p className="font-sans text-sm text-[#4a4452] leading-relaxed">
                {d.footerDesc}
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-sans text-xs font-bold text-[#111c2d] mb-5 uppercase tracking-wider">
                {d.footerProduct}
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href={lp("/#features")}
                    className="font-sans text-sm text-[#4a4452] hover:text-[#111c2d] transition-colors font-medium"
                  >
                    {d.footerFeatures}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/blog")}
                    className="font-sans text-sm text-[#4a4452] hover:text-[#111c2d] transition-colors font-medium"
                  >
                    {d.footerBlog}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/pricing")}
                    className="font-sans text-sm text-[#4a4452] hover:text-[#111c2d] transition-colors font-medium"
                  >
                    {d.footerPricing}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="font-sans text-xs font-bold text-[#111c2d] mb-5 uppercase tracking-wider">
                {d.footerAccount}
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href={lp("/login")}
                    className="font-sans text-sm text-[#4a4452] hover:text-[#111c2d] transition-colors font-medium"
                  >
                    {d.footerLogIn}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/signup")}
                    className="font-sans text-sm text-[#4a4452] hover:text-[#111c2d] transition-colors font-medium"
                  >
                    {d.footerSignUp}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/dashboard")}
                    className="font-sans text-sm text-[#4a4452] hover:text-[#111c2d] transition-colors font-medium"
                  >
                    {d.footerDashboard}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-sans text-xs font-bold text-[#111c2d] mb-5 uppercase tracking-wider">
                {d.footerLegal}
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="font-sans text-sm text-[#4a4452] hover:text-[#111c2d] transition-colors font-medium"
                  >
                    {d.footerPrivacy}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-sans text-sm text-[#4a4452] hover:text-[#111c2d] transition-colors font-medium"
                  >
                    {d.footerTerms}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar — no top border, subtle text separator only */}
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-sans text-sm text-[#4a4452]/70 font-medium">
              {d.footerCopyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
