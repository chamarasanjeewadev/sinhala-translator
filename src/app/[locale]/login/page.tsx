import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateAlternates } from "@/lib/i18n/utils";
import LoginContent from "./login-content";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);

  return {
    title: `${dict.auth.logInTitle} | ${dict.metadata.title}`,
    description: dict.auth.logInDesc,
    alternates: generateAlternates(locale as Locale, "/login"),
  };
}

export default function LoginPage() {
  return <LoginContent />;
}
