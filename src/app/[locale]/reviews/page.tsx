import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, MessageSquareQuote, Star } from "lucide-react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { localePath, generateAlternates, t as fill } from "@/lib/i18n/utils";
import { ogImages } from "@/lib/og-image";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { REVIEWS, RATINGS, USAGE, ratingAverage, ratingCount, recommendPercent } from "@/lib/reviews";

const PATH = "/reviews";

type Props = {
  params: Promise<{ locale: string }>;
};

// en-GB in both locales: the Workers runtime has no Sinhala month names and would
// fall back to US English, so production would not match local builds.
const formatDate = (date: string, month: "short" | "long" = "short") =>
  new Date(date).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month,
    ...(month === "long" ? { day: "numeric" } : {}),
  });

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "fill-ink/10 text-ink/15"}`}
        />
      ))}
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const d = (await getDictionary(locale as Locale)).reviews;
  return {
    alternates: generateAlternates(locale as Locale, PATH),
    openGraph: {
      images: ogImages,
      url: locale === "en" ? `https://helavoice.lk${PATH}` : `https://helavoice.lk/${locale}${PATH}`,
    },
    title: d.metaTitle,
    description: fill(d.metaDescription, { average: ratingAverage, count: ratingCount }),
  };
}

export default async function ReviewsPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const dict = await getDictionary(locale as Locale);
  const t = dict.reviews;
  const lp = (path: string) => localePath(path, locale as Locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";

  // Reviews of the product (SoftwareApplication), not the company: Google's
  // self-serving rule bars star snippets only for LocalBusiness/Organization.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HelaVoice.lk",
    url: siteUrl,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: CREDIT_PACKAGES.map((pkg) => ({
      "@type": "Offer",
      name: pkg.name,
      price: (pkg.price / 100).toFixed(2),
      priceCurrency: "USD",
    })),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: ratingAverage,
      ratingCount,
      bestRating: 5,
      worstRating: 1,
    },
    review: REVIEWS.filter((r) => r.name).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.name },
      datePublished: r.date,
      reviewBody: r.text,
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    })),
  };

  return (
    <div className="bg-transparent text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-mint/70 px-4 py-1.5 text-xs font-semibold text-leaf">
          <MessageSquareQuote className="h-3.5 w-3.5" />
          {t.heroBadge}
        </span>
        <h1 className="mt-6 font-display text-4xl sm:text-5xl font-bold tracking-tight">{t.heroTitle}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-ink/65 leading-relaxed">{t.heroSubtitle}</p>
      </section>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid gap-8 rounded-3xl border border-ink/10 bg-white/60 p-6 sm:p-8 md:grid-cols-2 md:items-center">
          <div className="text-center md:text-left">
            <p className="font-display text-4xl font-bold">{fill(t.ratingValue, { average: ratingAverage })}</p>
            <div className="mt-2 flex justify-center md:justify-start">
              <Stars rating={Math.floor(ratingAverage)} label={fill(t.starsLabel, { rating: ratingAverage })} />
            </div>
            <p className="mt-2 text-sm text-ink/65">{fill(t.ratingsCount, { count: ratingCount })}</p>
            <p className="mt-1 text-sm font-semibold text-leaf">{fill(t.recommend, { percent: recommendPercent })}</p>
            {USAGE.show && (
              <p className="mt-3 text-sm text-ink/65">
                {USAGE.signups} {t.signups} · {USAGE.payingCustomers} {t.payingCustomers}
              </p>
            )}
          </div>
          <ul className="space-y-1.5">
            {RATINGS.distribution
              .map((n, i) => ({ stars: i + 1, n }))
              .reverse()
              .map(({ stars, n }) => (
                <li key={stars} className="flex items-center gap-3 text-sm">
                  <span className="w-8 shrink-0 text-ink/65">{stars} ★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(n / ratingCount) * 100}%` }} />
                  </span>
                  <span className="w-6 shrink-0 text-right tabular-nums text-ink/65">{n}</span>
                </li>
              ))}
          </ul>
          <p className="text-xs text-ink/55 md:col-span-2">
            {fill(t.asOf, { date: formatDate(RATINGS.asOf, "long") })}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {REVIEWS.map((r) => (
            <figure key={`${r.date}-${r.text}`} className="flex flex-col rounded-2xl border border-ink/10 bg-white/60 p-6">
              <Stars rating={r.rating} label={fill(t.starsLabel, { rating: r.rating })} />
              <blockquote lang={r.lang ?? "en"} className="mt-4 flex-1 text-base leading-relaxed">
                “{r.text}”
              </blockquote>
              <figcaption className="mt-4 text-sm text-ink/65">
                <span className="font-semibold text-ink">{r.name ?? t.anonymous}</span> ·{" "}
                <time dateTime={r.date}>{formatDate(r.date)}</time>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="font-display text-2xl font-bold mb-3">{t.howTitle}</h2>
        <p className="text-sm text-ink/65 leading-relaxed">{t.howText}</p>
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
