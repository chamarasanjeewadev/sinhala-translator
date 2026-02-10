import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateAlternates } from "@/lib/i18n/utils";
import SignupContent from "./signup-content";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);

  return {
    title: `${dict.auth.createAccountTitle} | ${dict.metadata.title}`,
    description: dict.auth.signUpDesc,
    alternates: generateAlternates(locale as Locale, "/signup"),
  };
}

export default function SignupPage() {
  return <SignupContent />;
}
