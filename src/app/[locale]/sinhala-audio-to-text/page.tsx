import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Clock, Download, FileAudio, GraduationCap, MessageCircle, Mic, Pencil, Upload, Users } from "lucide-react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { localePath, generateAlternates, t as fill } from "@/lib/i18n/utils";
import { CHUNK_DURATION_SECONDS, CREDIT_PACKAGES } from "@/lib/constants";
import { getAudioUploadLimitMb, getSignupBonusConfig } from "@/lib/app-settings";
import { IconTile, type Tone } from "@/components/tool-catalog";
import { RelatedTools } from "@/components/related-tools";
import { ogImages } from "@/lib/og-image";
import type { LucideIcon } from "lucide-react";

const PATH = "/sinhala-audio-to-text";

// Example length used in the cost answer; credits = one per started CHUNK_DURATION_SECONDS part (see api/transcribe/analyze).
const EXAMPLE_MINUTES = 5;

type Props = {
  params: Promise<{ locale: string }>;
};

type Item = { title: string; desc: string };

const USE_ICONS: [LucideIcon, Tone][] = [
  [MessageCircle, "mint"],
  [GraduationCap, "peach"],
  [Mic, "lilac"],
  [Users, "sky"],
];

const GET_ICONS: [LucideIcon, Tone][] = [
  [Pencil, "mint"],
  [Users, "lilac"],
  [Clock, "peach"],
  [Download, "sky"],
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const d = (await getDictionary(locale as Locale)).audioToText;
  return {
    alternates: generateAlternates(locale as Locale, PATH),
    openGraph: {
      images: ogImages,
      url: locale === "en" ? `https://helavoice.lk${PATH}` : `https://helavoice.lk/${locale}${PATH}`,
    },
    title: d.metaTitle,
    description: d.metaDescription,
    keywords: [
      "sinhala audio to text converter",
      "sinhala audio to text",
      "audio to text sinhala",
      "convert sinhala audio to text",
      "sinhala audio transcription",
      "sinhala voice note to text",
      "whatsapp voice note to text sinhala",
      "සිංහල audio to text",
    ],
  };
}

export default async function SinhalaAudioToTextPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const dict = await getDictionary(locale as Locale);
  const t = dict.audioToText;
  const lp = (path: string) => localePath(path, locale as Locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";

  // Every number on the page comes from code or live settings, never from the copy.
  const [maxMb, { enabled: freeTier, amount: freeCredits }] = await Promise.all([getAudioUploadLimitMb(), getSignupBonusConfig()]);
  const chunkMin = CHUNK_DURATION_SECONDS / 60;
  const hasFree = freeTier && freeCredits > 0;
  const starter = CREDIT_PACKAGES.reduce((a, b) => (b.price < a.price ? b : a));
  const vars = {
    maxMb,
    chunkMin,
    exampleMinutes: EXAMPLE_MINUTES,
    exampleCredits: Math.ceil((EXAMPLE_MINUTES * 60) / CHUNK_DURATION_SECONDS),
    starterPrice: starter.priceDisplay,
    starterCredits: starter.credits,
    freeCredits,
    freeMinutes: freeCredits * chunkMin,
  };
  const freeNote = fill(hasFree ? t.freeYes : t.freeNo, vars);
  const f = (s: string) => fill(s, { ...vars, freeNote });

  const facts = t.facts.map((x: { label: string; value: string }) => ({ label: x.label, value: f(x.value) }));
  const howSteps = t.howSteps.map((s: Item) => ({ title: s.title, desc: f(s.desc) }));
  const faqItems = t.faqItems.map((item: { q: string; a: string }) => ({ q: f(item.q), a: f(item.a) }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HelaVoice Sinhala Audio to Text Converter",
    alternateName: ["Sinhala Audio to Text", "Sinhala Audio to Text Converter"],
    url: `${siteUrl}${PATH}`,
    description: t.metaDescription,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "si"],
    featureList: [
      "Sinhala audio file to text",
      "MP3, M4A, WAV, OGG, FLAC and WebM uploads",
      "Speaker labels and timestamps",
      "Edit, copy, and download as PDF, Word, text or Markdown",
    ],
    offers: [
      ...(hasFree
        ? [{ "@type": "Offer", price: "0", priceCurrency: "USD", description: `${freeCredits} free credits for new accounts` }]
        : []),
      ...CREDIT_PACKAGES.map((pkg) => ({
        "@type": "Offer",
        name: pkg.name,
        price: (pkg.price / 100).toFixed(2),
        priceCurrency: "USD",
        description: `${pkg.credits} credits`,
      })),
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item: { q: string; a: string }) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t.howTitle,
    step: howSteps.map((s: Item, i: number) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  };

  return (
    <div className="bg-transparent text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16 pb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-mint/70 px-4 py-1.5 text-xs font-semibold text-leaf">
          <FileAudio className="h-3.5 w-3.5" />
          {t.heroBadge}
        </span>
        <h1 className="mt-6 font-display text-4xl sm:text-5xl font-bold tracking-tight">{t.heroTitle}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-ink/65 leading-relaxed">{t.heroSubtitle}</p>

        {/* The transcription tool needs an account and credits, so it lives in the dashboard (Upload tab); these buttons lead there. */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={lp("/signup")}
            className="hero-primary-button inline-flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-bold text-white"
          >
            <Upload className="h-[15px] w-[15px]" />
            <span>{t.ctaPrimary}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={lp("/dashboard")}
            className="inline-flex items-center rounded-2xl border border-ink/10 bg-white/60 px-5 py-3.5 text-sm font-semibold text-ink/70 transition-colors hover:text-ink"
          >
            {t.ctaSecondary} <span className="ml-1">→</span>
          </Link>
        </div>
        <p className="mt-4 text-xs text-ink/60">
          {t.heroNote}
          {hasFree ? ` ${fill(dict.landing.freeCredits, { count: freeCredits })}.` : ""}
        </p>
        <p className="mt-2 text-xs text-ink/60">
          {t.liveText}{" "}
          <Link href={lp("/sinhala-voice-typing")} className="font-semibold text-leaf underline underline-offset-4 hover:text-ink">
            {t.liveLink}
          </Link>
        </p>

        <dl className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact: { label: string; value: string }) => (
            <div key={fact.label} className="rounded-2xl bg-white/60 border border-ink/10 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-leaf/90">{fact.label}</dt>
              <dd className="mt-1.5 text-sm font-semibold text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-leaf/90 mb-3">{t.howEyebrow}</p>
        <h2 className="text-center font-display text-3xl sm:text-4xl font-bold mb-14">{t.howTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {howSteps.map((step: Item, i: number) => (
            <div key={step.title} className="relative rounded-2xl bg-white/60 border border-ink/10 p-6 transition-colors hover:border-leaf/30">
              <div className="mb-5 font-mono text-sm font-semibold text-leaf/80">
                {String(i + 1).padStart(2, "0")}
                <span className="text-ink/55"> / 03</span>
              </div>
              <h3 className="text-base font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-ink/65 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-leaf/90 mb-3">{t.useEyebrow}</p>
        <h2 className="text-center font-display text-3xl sm:text-4xl font-bold mb-12">{t.useTitle}</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {t.useItems.map((item: Item, i: number) => (
            <li key={item.title} className="flex items-start gap-4 rounded-2xl bg-white/60 border border-ink/10 p-5">
              <IconTile icon={USE_ICONS[i][0]} tone={USE_ICONS[i][1]} />
              <div className="min-w-0">
                <h3 className="text-base font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-ink/65 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-leaf/90 mb-3">{t.getEyebrow}</p>
        <h2 className="text-center font-display text-3xl sm:text-4xl font-bold mb-12">{t.getTitle}</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {t.getItems.map((item: Item, i: number) => (
            <li key={item.title} className="flex items-start gap-4 rounded-2xl bg-white/60 border border-ink/10 p-5">
              <IconTile icon={GET_ICONS[i][0]} tone={GET_ICONS[i][1]} />
              <div className="min-w-0">
                <h3 className="text-base font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-ink/65 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Answers are plain text, not collapsed, so every FAQPage answer is also visible on the page. */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-leaf/90 mb-3">{t.faqEyebrow}</p>
        <h2 className="text-center font-display text-3xl sm:text-4xl font-bold mb-12">{t.faqTitle}</h2>
        <div className="flex flex-col gap-3">
          {faqItems.map((item: { q: string; a: string }) => (
            <div key={item.q} className="rounded-2xl bg-white/60 border border-ink/10 p-5">
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="text-sm text-ink/65 leading-relaxed mt-2">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <RelatedTools locale={locale as Locale} copy={dict.relatedTools} labels={dict.navbar} current="audioToText" />

      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/80 bg-gradient-pastel px-6 py-16 text-center">
          <h2 className="relative font-display text-3xl sm:text-4xl font-bold mb-3">{t.ctaTitle}</h2>
          <p className="relative text-ink/65 mb-8 max-w-xl mx-auto">{t.ctaSubtitle}</p>
          <Link href={lp("/signup")} className="relative inline-block">
            <span className="hero-primary-button inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold text-white">
              {t.ctaPrimary}
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
