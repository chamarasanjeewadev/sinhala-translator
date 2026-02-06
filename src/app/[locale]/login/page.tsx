"use client";

import { LocaleLink } from "@/components/locale-link";
import { AuthForm } from "@/components/auth-form";
import { useDictionary } from "@/lib/i18n/dictionary-context";

export default function LoginPage() {
  const dict = useDictionary();

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
