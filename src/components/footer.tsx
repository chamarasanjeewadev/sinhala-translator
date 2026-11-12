import Link from "next/link";
import { localePath } from "@/lib/i18n/utils";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { SUPPORT_EMAIL, WHATSAPP_NUMBER_DISPLAY, whatsappLink } from "@/lib/contact";

type FooterProps = {
  locale: Locale;
  dict: Dictionary;
};

const SISTER_PRODUCTS = [
  { name: "BabyJourney", url: "https://babyjourney.lk" },
  { name: "FlowerMarket", url: "https://flowermarket.lk" },
  { name: "FindAJob", url: "https://findajob.lk" },
] as const;

export function Footer({ locale, dict }: FooterProps) {
  const d = dict.landing;
  const lp = (path: string) => localePath(path, locale);

  return (
    <footer className="border-t border-ink/10 bg-transparent px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 grid gap-12 md:grid-cols-5">
          {/* Brand */}
          <div>
            <div className="mb-5 flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- server footer, tiny static asset */}
              <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-xl" />
              <span className="font-display text-lg font-bold text-ink">
                HelaVoice.lk
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#8f9a94]">
              {d.footerDesc}
            </p>
            <p className="mt-4 text-sm font-medium text-[#8f9a94]">
              {d.footerContact}{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-leaf transition-colors hover:text-ember"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p className="mt-2 text-sm font-medium text-[#8f9a94]">
              {dict.whatsapp.footerLabel}{" "}
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-[#4ade80] transition-colors hover:text-[#86efac]"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                {WHATSAPP_NUMBER_DISPLAY}
              </a>
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="section-eyebrow mb-5 text-ink/55">
              {d.footerProduct}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={lp("/#features")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerFeatures}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/subtitles")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerSubtitles}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/singlish-to-sinhala")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerSinglishTool}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/english-to-sinhala")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerEnSi}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/sinhala-to-english")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerSiEn}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/sinhala-text-to-speech")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerTts}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/qr-code-generator")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerQrGenerator}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/blog")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerBlog}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/pricing")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerPricing}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="section-eyebrow mb-5 text-ink/55">
              {d.footerAccount}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={lp("/login")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerLogIn}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/signup")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerSignUp}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/dashboard")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerDashboard}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="section-eyebrow mb-5 text-ink/55">
              {d.footerLegal}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={lp("/privacy")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerPrivacy}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/terms")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerTerms}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/support")}
                  className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                >
                  {d.footerSupport}
                </Link>
              </li>
            </ul>
          </div>

          {/* GritTech network */}
          <div>
            <h4 className="section-eyebrow mb-5 text-ink/55">
              {d.footerGritTechNetwork}
            </h4>
            <ul className="space-y-3">
              {SISTER_PRODUCTS.map((product) => (
                <li key={product.url}>
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener"
                    className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
                  >
                    {product.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-ink/10 pt-8 md:flex-row">
          <p className="text-sm font-medium text-[#8f9a94]/70">
            {d.footerCopyright}
          </p>
          <p className="text-sm font-medium text-[#8f9a94]/70">
            {d.footerBuiltBy}{" "}
            <a
              href="https://grittech.lk"
              target="_blank"
              rel="noopener"
              className="text-sm font-medium text-[#8f9a94] transition-colors hover:text-ink"
            >
              GritTech
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
