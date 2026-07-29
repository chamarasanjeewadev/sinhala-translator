import Link from "next/link";
import { AudioWaveform } from "lucide-react";
import { localePath } from "@/lib/i18n/utils";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type FooterProps = {
  locale: Locale;
  dict: Dictionary;
};

export function Footer({ locale, dict }: FooterProps) {
  const d = dict.landing;
  const lp = (path: string) => localePath(path, locale);

  return (
    <footer className="border-t border-white/8 bg-[#07000f] px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4c0095] to-[#7c3aed] shadow-[0_4px_12px_rgba(124,58,237,0.35)]">
                <AudioWaveform className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-white">
                HelaVoice.lk
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#a99fc4]">
              {d.footerDesc}
            </p>
            <p className="mt-4 text-sm font-medium text-[#a99fc4]">
              {d.footerContact}{" "}
              <a
                href="mailto:hi@helavoice.lk"
                className="text-violet-300 transition-colors hover:text-fuchsia-300"
              >
                hi@helavoice.lk
              </a>
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="section-eyebrow mb-5 text-white/50">
              {d.footerProduct}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={lp("/#features")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerFeatures}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/blog")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerBlog}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/pricing")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerPricing}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="section-eyebrow mb-5 text-white/50">
              {d.footerAccount}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={lp("/login")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerLogIn}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/signup")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerSignUp}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/dashboard")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerDashboard}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="section-eyebrow mb-5 text-white/50">
              {d.footerLegal}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={lp("/privacy")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerPrivacy}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/terms")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerTerms}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/support")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerSupport}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 md:flex-row">
          <p className="text-sm font-medium text-[#a99fc4]/70">
            {d.footerCopyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
