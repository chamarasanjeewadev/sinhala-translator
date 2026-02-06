import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

function getLocaleFromPath(pathname: string): { locale: Locale; rest: string } {
  for (const loc of locales) {
    if (loc === defaultLocale) continue;
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      const rest = pathname.slice(`/${loc}`.length) || "/";
      return { locale: loc, rest };
    }
  }
  return { locale: defaultLocale, rest: pathname };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip locale logic for API routes and auth callback
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return await updateSession(request);
  }

  const { locale } = getLocaleFromPath(pathname);

  // For default locale (en), the URL has no prefix — rewrite to /en/...
  // For si locale, the URL already has /si prefix — rewrite to /si/... (handled by [locale] segment)
  if (locale === defaultLocale) {
    // Rewrite /dashboard → /en/dashboard so the [locale] layout picks it up
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    const response = NextResponse.rewrite(url);
    // Run session update logic with locale awareness
    return await updateSession(request, locale, response);
  }

  return await updateSession(request, locale);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/stripe/webhook).*)",
  ],
};
