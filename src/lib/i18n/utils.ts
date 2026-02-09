import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "./config";

/**
 * Prefix a path with the locale segment.
 * English (default) gets no prefix; other locales get `/{locale}` prefix.
 */
export function localePath(path: string, locale: Locale): string {
  if (locale === defaultLocale) return path;
  return `/${locale}${path}`;
}

/**
 * Extract the locale and remaining pathname from a URL pathname.
 */
export function parsePathname(pathname: string): {
  locale: Locale;
  rest: string;
} {
  for (const loc of locales) {
    if (loc === defaultLocale) continue;
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      const rest = pathname.slice(`/${loc}`.length) || "/";
      return { locale: loc, rest };
    }
  }
  return { locale: defaultLocale, rest: pathname };
}

/**
 * Simple template interpolation: replaces `{key}` with values from `vars`.
 */
export function t(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

/**
 * Generate page-specific `alternates` metadata (canonical + hreflang).
 * `path` is the locale-independent path, e.g. "/" or "/pricing".
 */
export function generateAlternates(
  locale: Locale,
  path: string
): Metadata["alternates"] {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";
  const normalizedPath = path === "/" ? "" : path;

  const canonical =
    locale === defaultLocale
      ? `${siteUrl}${normalizedPath}`
      : `${siteUrl}/${locale}${normalizedPath}`;

  return {
    canonical,
    languages: {
      en: `${siteUrl}${normalizedPath}`,
      si: `${siteUrl}/si${normalizedPath}`,
      "x-default": `${siteUrl}${normalizedPath}`,
    },
  };
}
