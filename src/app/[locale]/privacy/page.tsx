import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateAlternates } from "@/lib/i18n/utils";
import { LegalPage } from "@/components/legal-page";
import { privacyContent } from "./content";

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const doc = privacyContent[locale];

  return {
    title: `${doc.title} | HelaVoice`,
    description: doc.intro[0],
    alternates: generateAlternates(locale as Locale, "/privacy"),
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  return <LegalPage doc={privacyContent[locale]} />;
}
