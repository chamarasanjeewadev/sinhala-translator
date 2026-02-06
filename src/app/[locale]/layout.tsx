import { notFound } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";
import { DictionaryProvider } from "@/lib/i18n/dictionary-context";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import type { Metadata } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);
  return {
    title: dict.metadata.title,
    description: dict.metadata.description,
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const dict = await getDictionary(locale as Locale);

  return (
    <LocaleProvider locale={locale as Locale}>
      <DictionaryProvider dictionary={dict}>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.lang="${locale}"`,
          }}
        />
        <Navbar />
        <main>{children}</main>
        <Toaster />
      </DictionaryProvider>
    </LocaleProvider>
  );
}
