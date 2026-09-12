import {
  QrCode,
  ImagePlus,
  Download,
  BadgeCheck,
  ShieldCheck,
  Infinity as InfinityIcon,
  ArrowRight,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { localePath, generateAlternates } from "@/lib/i18n/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { QrGenerator } from "@/components/qr-generator/qr-generator";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);
  const d = dict.qrGenerator;

  return {
    alternates: generateAlternates(locale as Locale, "/qr-code-generator"),
    openGraph: {
      url:
        locale === "en"
          ? "https://helavoice.lk/qr-code-generator"
          : `https://helavoice.lk/${locale}/qr-code-generator`,
    },
    title: d.metaTitle,
    description: d.metaDescription,
    keywords: [
      "qr code generator",
      "free qr code generator",
      "qr code generator with logo",
      "custom qr code generator",
      "wifi qr code generator",
      "qr code generator sri lanka",
      "create qr code",
      "qr code maker",
      "vcard qr code",
      "download qr code png svg",
    ],
  };
}

export default async function QrCodeGeneratorPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const dict = await getDictionary(locale as Locale);
  const d = dict.qrGenerator;

  const lp = (path: string) => localePath(path, locale as Locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";

  const featureIcons = [
    ImagePlus,
    QrCode,
    Download,
    BadgeCheck,
    ShieldCheck,
    InfinityIcon,
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HelaVoice Free QR Code Generator",
    alternateName: ["Free QR Code Generator", "QR Code Maker with Logo"],
    url: `${siteUrl}/qr-code-generator`,
    description: d.metaDescription,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "si"],
    featureList: [
      "Custom QR code design with dots and corner shapes",
      "Add a center logo",
      "Solid or gradient colours",
      "URL, WiFi, vCard, email, phone, SMS and text",
      "Download PNG, JPG and SVG",
      "No sign-up and no watermark",
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
          <QrCode className="h-3.5 w-3.5" />
          {d.heroBadge}
        </span>
        <h1 className="mt-6 font-display text-4xl sm:text-5xl font-bold tracking-tight">
          {d.heroTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed">
          {d.heroSubtitle}
        </p>
      </section>

      {/* ── Generator tool ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        <QrGenerator
          copy={{ content: d.content, design: d.design, preview: d.preview }}
        />
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
              const Icon = featureIcons[i] ?? QrCode;
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
