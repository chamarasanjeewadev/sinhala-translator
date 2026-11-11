"use client";

import { useSearchParams } from "next/navigation";
import { LocaleLink } from "@/components/locale-link";
import { AuthForm } from "@/components/auth-form";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { Check } from "lucide-react";

export default function LoginContent() {
  const dict = useDictionary();
  const searchParams = useSearchParams();
  const packageId = searchParams.get("package") ?? undefined;
  const pkg = packageId ? CREDIT_PACKAGES.find((p) => p.id === packageId) : null;

  if (pkg) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-5">
          <div className="rounded-2xl border border-leaf/25 bg-mint/70 px-6 py-5 backdrop-blur-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-leaf">
              You&apos;re purchasing
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-ink">{pkg.name} Pack</p>
                <p className="mt-0.5 text-sm text-ink/60">{pkg.credits} transcription credits</p>
              </div>
              <span className="text-4xl font-extrabold text-ink">{pkg.priceDisplay}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink/55">
              <Check className="h-3 w-3 flex-shrink-0 text-emerald-400" />
              <span>Credits never expire &middot; one-time payment &middot; no subscription</span>
            </div>
          </div>

          <AuthForm mode="login" packageId={packageId} />

          <p className="text-center text-sm text-ink/55">
            {dict.auth.noAccount}{" "}
            <LocaleLink
              href={`/signup?package=${packageId}`}
              className="text-leaf underline hover:text-leaf transition-colors"
            >
              {dict.auth.signUpLink}
            </LocaleLink>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <AuthForm mode="login" />
        <p className="text-center text-sm text-muted-foreground">
          {dict.auth.noAccount}{" "}
          <LocaleLink href="/signup" className="underline hover:text-foreground">
            {dict.auth.signUpLink}
          </LocaleLink>
        </p>
      </div>
    </div>
  );
}
