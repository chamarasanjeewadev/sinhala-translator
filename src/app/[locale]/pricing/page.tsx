import { Suspense } from "react";
import { PricingContent } from "./pricing-content";
import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateAlternates } from "@/lib/i18n/utils";
import { CREDIT_PACKAGES, FREE_CREDITS } from "@/lib/constants";
import { isSignupBonusEnabled } from "@/lib/app-settings";

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);

  return {
    title: `${dict.pricing.title} | ${dict.metadata.title}`,
    description: dict.pricing.subtitle,
    alternates: generateAlternates(locale as Locale, "/pricing"),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://helavoice.lk";

function buildPricingJsonLd(freeTier: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HelaVoice.lk",
    url: siteUrl,
    applicationCategory: "UtilitiesApplication",
    offers: [
      // Only advertise a free offer while the free tier is enabled.
      ...(freeTier
        ? [
            {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              name: "Free",
              description: `${FREE_CREDITS} free transcription credits on signup`,
            },
          ]
        : []),
      ...CREDIT_PACKAGES.map((pkg) => ({
        "@type": "Offer",
        name: pkg.name,
        price: (pkg.price / 100).toFixed(2),
        priceCurrency: "USD",
        description: `${pkg.credits} transcription credits`,
      })),
    ],
  };
}

export default async function PricingPage() {
  const freeTier = await isSignupBonusEnabled();
  const pricingJsonLd = buildPricingJsonLd(freeTier);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <Suspense>
        <PricingContent freeTier={freeTier} />
      </Suspense>
    </>
  );
}
