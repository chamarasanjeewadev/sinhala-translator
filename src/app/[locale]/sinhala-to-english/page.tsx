import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { locales, type Locale } from "@/lib/i18n/config";
import { TranslatorPage, translatorMetadata } from "@/components/translator-tool/translator-page";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  return translatorMetadata(locale as Locale, "si-en");
}

export default async function SinhalaToEnglishPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return <TranslatorPage locale={locale as Locale} direction="si-en" />;
}
