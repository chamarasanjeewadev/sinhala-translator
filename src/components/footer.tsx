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

const LINK = "whitespace-nowrap text-[0.9375rem] text-on-night-muted transition-colors hover:text-on-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-night rounded";
const HEAD = "mb-4 text-sm font-semibold text-on-night";

/** Statement footer on the logo pack's night tile: the tagline large, every link beneath. */
export function Footer({ locale, dict }: FooterProps) {
  const d = dict.landing;
  const lp = (path: string) => localePath(path, locale);

  const product = [
    { href: "/#tools", label: d.footerFeatures },
    { href: "/sinhala-audio-to-text", label: d.footerAudioToText },
    { href: "/subtitles", label: d.footerSubtitles },
    { href: "/singlish-to-sinhala", label: d.footerSinglishTool },
    { href: "/sinhala-voice-typing", label: d.footerVoiceTyping },
    { href: "/english-to-sinhala", label: d.footerEnSi },
    { href: "/sinhala-to-english", label: d.footerSiEn },
    { href: "/sinhala-text-to-speech", label: d.footerTts },
    { href: "/sinhala-scan-to-text", label: d.footerScan },
    { href: "/qr-code-generator", label: d.footerQrGenerator },
    { href: "/blog", label: d.footerBlog },
    { href: "/pricing", label: d.footerPricing },
    { href: "/reviews", label: d.footerReviews },
  ];
  const account = [
    { href: "/login", label: d.footerLogIn },
    { href: "/signup", label: d.footerSignUp },
    { href: "/dashboard", label: d.footerDashboard },
  ];
  const legal = [
    { href: "/privacy", label: d.footerPrivacy },
    { href: "/terms", label: d.footerTerms },
    { href: "/support", label: d.footerSupport },
  ];

  return (
    <footer className="bg-night text-on-night">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-16 lg:py-28">
        <p className="max-w-[16ch] font-display text-[clamp(2.25rem,5vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.03em] text-on-night [text-wrap:balance]">
          {d.footerStatement}
        </p>

        <div className="mt-16 grid gap-12 border-t border-on-night/15 pt-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand and contact */}
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="mb-4 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- server footer, tiny static asset */}
              <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-xl" />
              <span className="font-display text-lg font-bold text-on-night">HelaVoice.lk</span>
            </div>
            <p className="max-w-[34ch] text-[0.9375rem] leading-relaxed text-on-night-muted">{d.footerDesc}</p>
            <p className="mt-5 text-[0.9375rem] text-on-night-muted">
              {d.footerContact}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-on-night underline underline-offset-4 hover:no-underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p className="mt-2 text-[0.9375rem] text-on-night-muted">
              {dict.whatsapp.footerLabel}{" "}
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 whitespace-nowrap font-semibold text-on-night underline underline-offset-4 hover:no-underline"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {WHATSAPP_NUMBER_DISPLAY}
              </a>
            </p>
          </div>

          {/* Product: two short columns */}
          <nav className="sm:col-span-2 lg:col-span-4" aria-label={d.footerProduct}>
            <h2 className={HEAD}>{d.footerProduct}</h2>
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {product.map((l) => (
                <li key={l.href}>
                  <Link href={lp(l.href)} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-label={d.footerAccount}>
            <h2 className={HEAD}>{d.footerAccount}</h2>
            <ul className="space-y-3">
              {account.map((l) => (
                <li key={l.href}>
                  <Link href={lp(l.href)} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h2 className={`${HEAD} mt-8`}>{d.footerLegal}</h2>
            <ul className="space-y-3">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link href={lp(l.href)} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-label={d.footerGritTechNetwork}>
            <h2 className={HEAD}>{d.footerGritTechNetwork}</h2>
            <ul className="space-y-3">
              {SISTER_PRODUCTS.map((product) => (
                <li key={product.url}>
                  <a href={product.url} target="_blank" rel="noopener" className={LINK}>
                    {product.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-16 flex flex-col justify-between gap-3 text-sm text-on-night-muted md:flex-row">
          <p>{d.footerCopyright.replace("{year}", String(new Date().getFullYear()))}</p>
          <p>
            {d.footerBuiltBy}{" "}
            <a href="https://grittech.lk" target="_blank" rel="noopener" className="text-on-night underline underline-offset-4 hover:no-underline">
              GritTech
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
