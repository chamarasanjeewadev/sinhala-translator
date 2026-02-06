import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_ROUTES, AUTH_ROUTES } from "../constants";
import { defaultLocale, type Locale } from "../i18n/config";
import { localePath } from "../i18n/utils";

export async function updateSession(
  request: NextRequest,
  locale?: Locale,
  existingResponse?: NextResponse
) {
  let supabaseResponse = existingResponse ?? NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          if (!existingResponse) {
            supabaseResponse = NextResponse.next({ request });
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentLocale = locale ?? defaultLocale;
  const pathname = request.nextUrl.pathname;

  // Strip locale prefix for route matching
  let strippedPath = pathname;
  if (currentLocale !== defaultLocale) {
    if (pathname === `/${currentLocale}`) {
      strippedPath = "/";
    } else if (pathname.startsWith(`/${currentLocale}/`)) {
      strippedPath = pathname.slice(`/${currentLocale}`.length);
    }
  }

  // Redirect unauthenticated users away from protected routes
  if (
    !user &&
    PROTECTED_ROUTES.some((route) => strippedPath.startsWith(route))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = localePath("/login", currentLocale);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth routes
  if (user && AUTH_ROUTES.some((route) => strippedPath.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = localePath("/dashboard", currentLocale);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
