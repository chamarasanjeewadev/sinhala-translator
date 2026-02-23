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

  // Redirect /en (default locale) to / to avoid double prefixing and strictly enforce clean URLs
  if (pathname === `/${defaultLocale}` || pathname.startsWith(`/${defaultLocale}/`)) {
    const newPath = pathname.replace(new RegExp(`^/${defaultLocale}`), "") || "/";
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url);
  }

  const { locale } = getLocaleFromPath(pathname);

  // Set locale header so the root layout can read it for <html lang>
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  // For default locale (en), the URL has no prefix — rewrite to /en/...
  // For si locale, the URL already has /si prefix — rewrite to /si/... (handled by [locale] segment)
  if (locale === defaultLocale) {
    // Rewrite /dashboard → /en/dashboard so the [locale] layout picks it up
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    const response = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    // Run session update logic with locale awareness
    return await updateSession(request, locale, response);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return await updateSession(request, locale, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.svg|robots\\.txt|sitemap\\.xml|sitemap/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml)$|api/stripe/webhook).*)",
  ],
};
