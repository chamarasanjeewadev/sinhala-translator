import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, type Locale, locales } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/utils";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: Locale =
    localeCookie && locales.includes(localeCookie as Locale)
      ? (localeCookie as Locale)
      : defaultLocale;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return noStoreRedirect(`${origin}${localePath(next, locale)}`);
    }
  }

  return noStoreRedirect(
    `${origin}${localePath("/login", locale)}?error=auth_failed`
  );
}

// The callback response carries session Set-Cookie headers — it must never
// be cached by any intermediary.
function noStoreRedirect(url: string): NextResponse {
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}
