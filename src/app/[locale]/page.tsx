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
      color: "from-violet-500 to-violet-600",
    },
    {
      icon: Globe2,
      title: d.featureAnywhere,
      desc: d.featureAnywhereDesc,
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Download,
      title: d.featureCopy,
      desc: d.featureCopyDesc,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      icon: Sparkles,
      title: d.featureAI,
      desc: d.featureAIDesc,
      color: "from-amber-500 to-amber-600",
    },
    {
      icon: Languages,
      title: d.featureSinhala,
      desc: d.featureSinhalaDesc,
      color: "from-rose-500 to-rose-600",
    },
    {
      icon: Mic,
      title: d.featureRecord,
      desc: d.featureRecordDesc,
      color: "from-indigo-500 to-indigo-600",
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero Section */}
      <section className="pt-24 pb-24 px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-slate-200/40 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-50 backdrop-blur-sm border border-slate-200/50 rounded-full px-5 py-2 mb-8 shadow-sm">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-slate-700 bg-clip-text text-transparent">
                {d.badge}
              </span>
            </div>

            <h1 className="text-6xl lg:text-8xl font-extrabold text-slate-900 leading-[1.05] mb-8 tracking-tight">
              {d.heroTitle1}
              <br />
              <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
                {d.heroTitle2}
              </span>
            </h1>

            <p className="text-xl lg:text-2xl text-slate-600 mb-12 leading-relaxed max-w-3xl mx-auto font-light">
              {d.heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href={lp("/signup")}
                className="group bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white px-8 py-4 rounded-2xl text-base font-semibold transition-all flex items-center justify-center gap-2 shadow-2xl shadow-slate-900/25 hover:shadow-slate-900/40 hover:-translate-y-1"
              >
                <span>{d.startTranscribing}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href={lp("/pricing")}
                className="bg-white hover:bg-slate-50 text-slate-900 px-8 py-4 rounded-2xl text-base font-semibold transition-all border-2 border-slate-200 hover:border-slate-300 hover:shadow-lg text-center"
              >
                {d.viewPricing}
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-600">
              <div className="flex items-center gap-2.5 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">
                  {t(d.freeCredits, { count: FREE_CREDITS })}
                </span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">{d.noSubscription}</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">{d.poweredByGemini}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-24 px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-10 lg:p-16 shadow-2xl shadow-slate-200/50">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/20 to-blue-600/20 blur-3xl" />

                  <div className="absolute top-6 left-6 flex items-center gap-2.5 z-10">
                    <div className="relative">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <span className="text-white text-sm font-semibold">
                      {d.recording}
                    </span>
                  </div>

                  <div className="absolute bottom-8 left-8 right-8 z-10">
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <Mic className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 flex gap-1 h-10 items-end">
                          {waveformBars.map((bar, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-gradient-to-t from-violet-400 to-blue-400 rounded-full"
                              style={{
                                height: `${bar.height}%`,
                                animation: `pulse ${bar.duration}s ease-in-out infinite`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-white text-base font-medium leading-relaxed">
                        {d.demoTranscript}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8 order-1 lg:order-2">
                <div>
                  <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-5 leading-tight">
                    {d.demoTitle1}
                    <br />
                    <span className="bg-gradient-to-r from-violet-600 to-slate-700 bg-clip-text text-transparent">
                      {d.demoTitle2}
                    </span>
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    {d.demoDesc}
                  </p>
                </div>

                <div className="grid gap-5">
                  <div className="flex gap-5 p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 hover:shadow-lg transition-all group">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/25 group-hover:shadow-xl group-hover:shadow-violet-500/40 transition-all">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1.5 text-lg">
                        {d.lightningFast}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {d.lightningFastDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-5 p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 hover:shadow-lg transition-all group">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/25 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all">
                      <Languages className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1.5 text-lg">
                        {d.sinhalaOptimized}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {d.sinhalaOptimizedDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-5 p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 hover:shadow-lg transition-all group">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25 group-hover:shadow-xl group-hover:shadow-emerald-500/40 transition-all">
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1.5 text-lg">
                        {d.recordOrUpload}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {d.recordOrUploadDesc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 lg:px-8 relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-200/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-20 text-center mx-auto">
            <h2 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">
              {d.featuresTitle1}
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-blue-600 to-slate-700 bg-clip-text text-transparent">
                {d.featuresTitle2}
              </span>
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              {d.featuresSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white/70 backdrop-blur-sm rounded-2xl p-8 hover:bg-white transition-all border border-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1"
              >
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="credits" className="py-32 px-6 lg:px-8 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-violet-50/30" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
              {d.pricingTitle1}
              <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                {d.pricingTitle2}
              </span>
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              {d.pricingSubtitle}
            </p>
          </div>

          <div className="max-w-5xl mx-auto mb-16">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-10 shadow-xl">
              <div className="grid md:grid-cols-3 gap-10">
                <div className="text-center">
                  <div className="text-5xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3">
                    {d.oneCredit}
                  </div>
                  <div className="text-slate-600 font-medium">
                    {d.oneTranscription}
                  </div>
                </div>
                <div className="text-center border-l border-r border-slate-200">
                  <div className="text-5xl font-extrabold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent mb-3">
                    {FREE_CREDITS}
                  </div>
                  <div className="text-slate-600 font-medium">
                    {d.freeCreditsOnSignup}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
                    &infin;
                  </div>
                  <div className="text-slate-600 font-medium">
                    {d.creditsNeverExpire}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                    className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 relative transform md:scale-105 shadow-2xl transition-all"
                  >
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-lg">
                      {d.mostPopular}
                    </div>

                    <div className="mb-8">
                      <div className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
                        {pkg.name}
                      </div>
                      <div className="flex items-end gap-2 mb-4">
                        <span className="text-6xl font-extrabold text-white">
                          {pkg.credits}
                        </span>
                        <span className="text-slate-400 mb-3 text-lg font-semibold">
                          {d.credits}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 font-medium">
                        {pkg.priceDisplay}{" "}
                        <span className="text-slate-500">
                          &middot; {t(d.perCredit, { price: pricePerCredit })}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-4 mb-10">
                      {tierFeatures.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-sm text-white"
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={lp("/signup")}
                      className="block w-full bg-white hover:bg-slate-50 text-slate-900 px-6 py-4 rounded-2xl font-black transition-all shadow-xl hover:shadow-2xl text-center"
                    >
                      {d.getStarted}
                    </Link>
                  </div>
                );
              }

              return (
                <div
                  key={pkg.id}
                  className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 p-8 hover:border-slate-300 transition-all hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="mb-8">
                    <div className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wide">
                      {pkg.name}
                    </div>
                    <div className="flex items-end gap-2 mb-4">
                      <span className="text-6xl font-extrabold text-slate-900">
                        {pkg.credits}
                      </span>
                      <span className="text-slate-600 mb-3 text-lg font-semibold">
                        {d.credits}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 font-medium">
                      {pkg.priceDisplay}{" "}
                      <span className="text-slate-400">
                        &middot; {t(d.perCredit, { price: pricePerCredit })}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-10">
                    {tierFeatures.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-sm text-slate-600"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={lp("/signup")}
                    className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-900 px-6 py-4 rounded-2xl font-bold transition-all hover:shadow-lg text-center"
                  >
                    {d.getStarted}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-16">
            <p className="text-slate-600 mb-4 text-lg">{d.needMoreCredits}</p>
            <Link
              href={lp("/pricing")}
              className="text-slate-900 font-bold hover:underline inline-flex items-center gap-2 group"
            >
              {d.viewAllPackages}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 lg:px-8 relative">
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-16 lg:p-20 text-center overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-4xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                {d.ctaTitle}
              </h2>
              <p className="text-xl lg:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                {t(d.ctaSubtitle, { count: FREE_CREDITS })}
              </p>
              <Link
                href={lp("/signup")}
                className="bg-white hover:bg-slate-50 text-slate-900 px-10 py-5 rounded-2xl text-lg font-black transition-all inline-flex items-center gap-3 shadow-2xl hover:shadow-white/20 hover:-translate-y-1 group"
              >
                <span>{d.ctaButton}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="mt-6 text-sm text-slate-300">
                {d.guideIntro}{" "}
                <Link
                  href={guidePath}
                  className="text-white font-semibold underline underline-offset-4 hover:text-slate-200"
                >
                  {d.guideLink}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-16 px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                  <AudioWaveform className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  HelaVoice.lk
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {d.footerDesc}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-5 uppercase tracking-wide">
                {d.footerProduct}
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href={lp("/#features")}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
                  >
                    {d.footerFeatures}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/blog")}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
                  >
                    {d.footerBlog}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/pricing")}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
                  >
                    {d.footerPricing}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-5 uppercase tracking-wide">
                {d.footerAccount}
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href={lp("/login")}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
                  >
                    {d.footerLogIn}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/signup")}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
                  >
                    {d.footerSignUp}
                  </Link>
                </li>
                <li>
                  <Link
                    href={lp("/dashboard")}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
                  >
                    {d.footerDashboard}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-5 uppercase tracking-wide">
                {d.footerLegal}
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
                  >
                    {d.footerPrivacy}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
                  >
                    {d.footerTerms}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-slate-600 font-medium">
              {d.footerCopyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
