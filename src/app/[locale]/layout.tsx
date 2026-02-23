import { notFound } from "next/navigation";
import { ViewTransitions } from "next-view-transitions";
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
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://helavoice.lk';

  return {
    title: {
      default: dict.metadata.title,
      template: `%s | ${dict.metadata.title}`,
    },
    description: dict.metadata.description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title: dict.metadata.title,
      description: dict.metadata.description,
      siteName: 'HelaVoice.lk',
      locale: locale,
      type: 'website',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: dict.metadata.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.metadata.title,
      description: dict.metadata.description,
      images: ['/og-image.jpg'],
    },
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


export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// export const dynamic = 'force-static';



export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const dict = await getDictionary(locale as Locale);

  return (
    <ViewTransitions>
      <LocaleProvider locale={locale as Locale}>
        <DictionaryProvider dictionary={dict}>
          <Navbar />
          <main>{children}</main>
          <Toaster />
        </DictionaryProvider>
      </LocaleProvider>
    </ViewTransitions>
  );
}
