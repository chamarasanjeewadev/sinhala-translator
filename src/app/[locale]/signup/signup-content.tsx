"use client";

import { useSearchParams } from "next/navigation";
import { LocaleLink } from "@/components/locale-link";
import { AuthForm } from "@/components/auth-form";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { Check } from "lucide-react";

export default function SignupContent() {
  const dict = useDictionary();
  const searchParams = useSearchParams();
  const packageId = searchParams.get("package") ?? undefined;
  const pkg = packageId ? CREDIT_PACKAGES.find((p) => p.id === packageId) : null;

  if (pkg) {
    return (
      <div className="min-h-screen bg-[linear-gradient(155deg,#07000f_0%,#0d0020_50%,#130030_100%)] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-5">
          <div className="rounded-2xl border border-violet-400/25 bg-violet-500/12 px-6 py-5 backdrop-blur-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-300">
              You&apos;re purchasing
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">{pkg.name} Pack</p>
                <p className="mt-0.5 text-sm text-white/55">{pkg.credits} transcription minutes</p>
              </div>
              <span className="text-4xl font-extrabold text-white">{pkg.priceDisplay}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-white/45">
              <Check className="h-3 w-3 flex-shrink-0 text-emerald-400" />
              <span>Credits never expire &middot; one-time payment &middot; no subscription</span>
            </div>
          </div>

          <AuthForm mode="signup" packageId={packageId} />

          <p className="text-center text-sm text-white/45">
            {dict.auth.hasAccount}{" "}
            <LocaleLink
              href={`/login?package=${packageId}`}
              className="text-violet-300 underline hover:text-violet-200 transition-colors"
            >
              {dict.auth.logInLink}
            </LocaleLink>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <AuthForm mode="signup" />
        <p className="text-center text-sm text-muted-foreground">
          {dict.auth.hasAccount}{" "}
          <LocaleLink href="/login" className="underline hover:text-foreground">
            {dict.auth.logInLink}
          </LocaleLink>
        </p>
      </div>
    </div>
  );
}
