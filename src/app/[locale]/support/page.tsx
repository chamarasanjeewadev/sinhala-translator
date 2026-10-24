import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateAlternates } from "@/lib/i18n/utils";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { SupportForm } from "@/components/support-form";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { WHATSAPP_NUMBER_DISPLAY, whatsappLink } from "@/lib/contact";

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
    title: `${dict.support.metaTitle} | HelaVoice`,
    description: dict.support.metaDescription,
    alternates: generateAlternates(locale as Locale, "/support"),
  };
}

export default async function SupportPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const dict = await getDictionary(locale as Locale);

  return (
    <div className="min-h-screen bg-[#faf8ff]">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <h1 className="mb-3 font-sans text-3xl font-bold text-[#111c2d] md:text-4xl">
          {dict.support.title}
        </h1>
        <p className="mb-10 font-sans text-base leading-relaxed text-[#4a4452]">
          {dict.support.subtitle}
        </p>
        <a
          href={whatsappLink(dict.whatsapp.prefill)}
          target="_blank"
          rel="noopener"
          className="mb-8 flex items-center gap-4 rounded-2xl border border-[#25d366]/30 bg-[#25d366]/8 p-5 transition-colors hover:bg-[#25d366]/12"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
            <WhatsAppIcon className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-sans text-base font-semibold text-[#111c2d]">
              {dict.whatsapp.supportTitle}
            </span>
            <span className="block font-sans text-sm leading-relaxed text-[#4a4452]">
              {dict.whatsapp.supportBody.replace("{number}", WHATSAPP_NUMBER_DISPLAY)}
            </span>
          </span>
        </a>
        <SupportForm />
      </div>
    </div>
  );
}
