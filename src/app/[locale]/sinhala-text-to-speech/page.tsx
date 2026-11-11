import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Volume2 } from "lucide-react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { localePath, generateAlternates } from "@/lib/i18n/utils";
import { TtsTool } from "@/components/tts-tool/tts-tool";

const PATH = "/sinhala-text-to-speech";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const d = (await getDictionary(locale as Locale)).textToSpeech;
  return {
    alternates: generateAlternates(locale as Locale, PATH),
    openGraph: {
      url: locale === "en" ? `https://helavoice.lk${PATH}` : `https://helavoice.lk/${locale}${PATH}`,
    },
    title: d.metaTitle,
    description: d.metaDescription,
    keywords: [
      "sinhala text to speech",
      "sinhala tts",
      "text to speech sinhala",
      "sinhala voice generator",
      "sinhala voice over",
      "sinhala audio generator",
      "සිංහල ටෙක්ස්ට් ටු ස්පීච්",
    ],
  };
}

export default async function SinhalaTextToSpeechPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const dict = await getDictionary(locale as Locale);
  const t = dict.textToSpeech;
  const lp = (path: string) => localePath(path, locale as Locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HelaVoice Sinhala Text to Speech",
    url: `${siteUrl}${PATH}`,
    description: t.metaDescription,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "si"],
    featureList: ["Sinhala text to speech", "Multiple voices", "Singlish typing", "WAV download"],
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faqItems.map((item: { q: string; a: string }) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="bg-transparent text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-mint/70 px-4 py-1.5 text-xs font-semibold text-leaf">
          <Volume2 className="h-3.5 w-3.5" />
          {t.heroBadge}
        </span>
        <h1 className="mt-6 font-display text-4xl sm:text-5xl font-bold tracking-tight">{t.heroTitle}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-ink/65 leading-relaxed">{t.heroSubtitle}</p>
      </section>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-6">
        <TtsTool
          labels={t.ui}
          voiceStyles={t.voiceStyles}
          signupHref={lp("/signup")}
          loginHref={lp("/login")}
          pricingHref={lp("/pricing")}
        />
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-leaf/90 mb-3">{t.faqEyebrow}</p>
        <h2 className="text-center font-display text-3xl sm:text-4xl font-bold mb-12">{t.faqTitle}</h2>
        <div className="flex flex-col gap-3">
          {t.faqItems.map((item: { q: string; a: string }) => (
            <details key={item.q} className="group rounded-2xl bg-white/60 border border-ink/10 p-5 open:border-leaf/30 transition-colors">
              <summary className="cursor-pointer text-sm font-semibold list-none flex items-center justify-between gap-4">
                {item.q}
                <span className="text-ink/55 group-open:rotate-45 transition-transform text-xl leading-none shrink-0">+</span>
              </summary>
              <p className="text-sm text-ink/65 leading-relaxed mt-3">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/80 bg-gradient-pastel px-6 py-16 text-center">
          <h2 className="relative font-display text-3xl sm:text-4xl font-bold mb-3">{t.ctaTitle}</h2>
          <p className="relative text-ink/65 mb-8 max-w-xl mx-auto">{t.ctaSubtitle}</p>
          <Link href={lp("/")} className="relative inline-block">
            <button className="hero-primary-button inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold text-white">
              {t.ctaButton}
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
