import {
  Keyboard,
  Mic,
  ClipboardPaste,
  Type,
  Languages,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { localePath, generateAlternates } from "@/lib/i18n/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { SinglishTool } from "@/components/singlish-tool/singlish-tool";
import {
  SinglishGuideGrid,
  SINGLISH_EXAMPLES,
} from "@/components/singlish/singlish-guide";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);
  const d = dict.singlishTool;

  return {
    alternates: generateAlternates(locale as Locale, "/singlish-to-sinhala"),
    openGraph: {
      url:
        locale === "en"
          ? "https://helavoice.lk/singlish-to-sinhala"
          : `https://helavoice.lk/${locale}/singlish-to-sinhala`,
    },
    title: d.metaTitle,
    description: d.metaDescription,
    keywords: [
      "singlish to sinhala",
      "sinhala typing",
      "sinhala typing online",
      "sinhala keyboard",
      "online sinhala keyboard",
      "english to sinhala typing",
      "sinhala unicode",
      "sinhala unicode converter",
      "unicode to fm abhaya",
      "fm abhaya converter",
      "sinhala voice typing",
      "සිංහල ටයිප්",
    ],
  };
}

export default async function SinglishToSinhalaPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const dict = await getDictionary(locale as Locale);
  const d = dict.singlishTool;

  const lp = (path: string) => localePath(path, locale as Locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";

  const featureIcons = [Keyboard, Mic, ClipboardPaste, Type, Languages, ShieldCheck];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HelaVoice Singlish to Sinhala Typing",
    alternateName: [
      "Singlish to Sinhala Converter",
      "Online Sinhala Keyboard",
      "Unicode to FM Abhaya Converter",
    ],
    url: `${siteUrl}/singlish-to-sinhala`,
    description: d.metaDescription,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "si"],
    featureList: [
      "Live Singlish to Sinhala Unicode typing",
      "Sinhala voice typing",
      "Paste and convert Singlish paragraphs",
      "Unicode to FM Abhaya legacy font converter",
      "Sinhala to Singlish converter",
      "Download as PDF, Word or text",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: d.faqItems.map((item: { q: string; a: string }) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: d.howTitle,
    step: d.howSteps.map((s: { title: string; desc: string }, i: number) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  };

  return (
    <div className="bg-[#07000f] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16 pb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-200">
          <Keyboard className="h-3.5 w-3.5" />
          {d.heroBadge}
        </span>
        <h1 className="mt-6 font-display text-4xl sm:text-5xl font-bold tracking-tight">
          {d.heroTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed">
          {d.heroSubtitle}
        </p>
      </section>

      {/* ── Typing tool ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-10">
        <SinglishTool labels={d.ui} />
      </section>

      {/* ── Key guide (indexable) ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold mb-2">{d.ui.guideTitle}</h2>
          <p className="text-sm text-white/60 leading-relaxed mb-6 max-w-3xl">{d.ui.guideHint}</p>
          <SinglishGuideGrid
            className="gap-y-3"
            romanClassName="text-white/80"
            sinhalaClassName="text-violet-200"
          />
          <h3 className="text-sm font-semibold mt-8 mb-3">{d.ui.examplesTitle}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SINGLISH_EXAMPLES.map((ex) => (
              <li
                key={ex.roman}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl bg-white/[0.04] px-4 py-2.5"
              >
                <code className="font-mono text-xs text-white/70">{ex.roman}</code>
                <span className="text-white/30">→</span>
                <span className="sinhala-text text-base text-white">{ex.sinhala}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90 mb-3">
          {d.howEyebrow}
        </p>
        <h2 className="text-center font-display text-3xl sm:text-4xl font-bold mb-14">
          {d.howTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {d.howSteps.map((step: { title: string; desc: string }, i: number) => (
            <div
              key={step.title}
              className="relative rounded-2xl bg-white/[0.04] border border-white/10 p-6 transition-colors hover:border-violet-400/30"
            >
              <div className="mb-5 font-mono text-sm font-semibold text-violet-300/80">
                {String(i + 1).padStart(2, "0")}
                <span className="text-white/20"> / 03</span>
              </div>
              <h3 className="text-base font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90 mb-3">
          {d.featuresEyebrow}
        </p>
        <h2 className="text-center font-display text-3xl sm:text-4xl font-bold mb-14">
          {d.featuresTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {d.features.map(
            (feature: { title: string; desc: string }, i: number) => {
              const Icon = featureIcons[i] ?? Keyboard;
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl bg-white/[0.04] border border-white/10 p-6 transition-colors hover:border-violet-400/30 hover:bg-white/[0.06]"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/12 border border-violet-400/20">
                    <Icon className="w-5 h-5 text-violet-300" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90 mb-3">
          {d.faqEyebrow}
        </p>
        <h2 className="text-center font-display text-3xl sm:text-4xl font-bold mb-12">
          {d.faqTitle}
        </h2>
        <div className="flex flex-col gap-3">
          {d.faqItems.map((item: { q: string; a: string }) => (
            <details
              key={item.q}
              className="group rounded-2xl bg-white/[0.04] border border-white/10 p-5 open:border-violet-400/30 transition-colors"
            >
              <summary className="cursor-pointer text-sm font-semibold list-none flex items-center justify-between gap-4">
                {item.q}
                <span className="text-white/40 group-open:rotate-45 transition-transform text-xl leading-none shrink-0">
                  +
                </span>
              </summary>
              <p className="text-sm text-white/60 leading-relaxed mt-3">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA (cross-link to the core product) ── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-violet-400/20 bg-[linear-gradient(135deg,rgba(76,0,149,0.4),rgba(19,0,48,0.4))] px-6 py-16 text-center">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(232,121,249,0.25),transparent_60%)] blur-2xl" />
          <h2 className="relative font-display text-3xl sm:text-4xl font-bold mb-3">
            {d.ctaTitle}
          </h2>
          <p className="relative text-white/60 mb-8 max-w-xl mx-auto">
            {d.ctaSubtitle}
          </p>
          <Link href={lp("/")} className="relative inline-block">
            <button className="hero-primary-button inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold text-white">
              {d.ctaButton}
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
