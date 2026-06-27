import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "./server";

/**
 * Supabase client for API routes that serve both the web app and the mobile
 * app. The mobile app authenticates with an "Authorization: Bearer <jwt>"
 * header (Supabase access token); the web app uses session cookies. When the
 * header is present we build a header-scoped client (RLS and RPCs run as the
 * user), otherwise we fall back to the cookie-based server client.
 *
 * Routes must resolve the user with `supabase.auth.getUser(bearerToken)`:
 * `bearerToken` is undefined on the cookie path, so getUser falls back to the
 * cookie session there, while on the Bearer path the token is validated
 * explicitly (a header-only client has no stored session for getUser to use).
 */
export async function createClientFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    return { supabase, bearerToken: authHeader.slice("bearer ".length) };
  }

  return { supabase: await createCookieClient(), bearerToken: undefined };
}
