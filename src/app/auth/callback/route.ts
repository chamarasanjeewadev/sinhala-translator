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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = noStoreRedirect(`${origin}${localePath(next, locale)}`);
      const user = data.user;
      const provider = user?.app_metadata?.provider ?? "email";
      // New account = created just now (Google) or email confirmed just now.
      // Read once by <SignupTracker> to fire the GA4 sign_up event.
      if (user && (isRecent(user.created_at) || (provider === "email" && isRecent(user.email_confirmed_at)))) {
        res.cookies.set("hv_signup", provider, { path: "/", maxAge: 900, sameSite: "lax" });
      }
      return res;
    }
  }

  return noStoreRedirect(
    `${origin}${localePath("/login", locale)}?error=auth_failed`
  );
}

function isRecent(iso: string | undefined): boolean {
  return !!iso && Date.now() - Date.parse(iso) < 10 * 60 * 1000;
}

// The callback response carries session Set-Cookie headers — it must never
// be cached by any intermediary.
function noStoreRedirect(url: string): NextResponse {
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}
