"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-context";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { parsePathname, localePath } from "@/lib/i18n/utils";

export function LanguageSwitcher() {
  const locale = useLocale();
  const dict = useDictionary();
  const pathname = usePathname();
  const router = useRouter();

  const targetLocale: Locale = locale === "en" ? "si" : "en";
  const label = dict.languageSwitcher[targetLocale];

  const handleSwitch = () => {
    const { rest } = parsePathname(pathname);
    const newPath = localePath(rest, targetLocale);

    document.cookie = `NEXT_LOCALE=${targetLocale};path=/;max-age=${60 * 60 * 24 * 365}`;

    if (targetLocale === defaultLocale) {
      document.documentElement.lang = "en";
    } else {
      document.documentElement.lang = "si";
    }

    router.push(newPath);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      className="gap-1.5 text-slate-600 hover:text-slate-900"
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-medium">{label}</span>
    </Button>
  );
}
