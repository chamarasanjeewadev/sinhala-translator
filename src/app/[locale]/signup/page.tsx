import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateAlternates, t } from "@/lib/i18n/utils";
import { getSignupBonusConfig } from "@/lib/app-settings";
import SignupContent from "./signup-content";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);
  const { enabled, amount } = await getSignupBonusConfig();

  return {
    title: `${dict.auth.createAccountTitle} | ${dict.metadata.title}`,
    description: enabled
      ? t(dict.auth.signUpDesc, { count: amount })
      : dict.auth.signUpDescNoBonus,
    alternates: generateAlternates(locale as Locale, "/signup"),
    robots: { index: false, follow: false },
  };
}

export default async function SignupPage() {
  const { enabled, amount } = await getSignupBonusConfig();
  return (
    <Suspense>
      <SignupContent freeCredits={enabled ? amount : null} />
    </Suspense>
  );
}
