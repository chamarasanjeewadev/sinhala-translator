import { createClientFromRequest } from "@/lib/supabase/request";
import { translateText } from "@/lib/gemini-translate";
import { privateJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportError, toClientError } from "@/lib/report-error";
import { clientIp, parseTranslateTextBody, textLimitFor } from "@/lib/text-translate";

// Free English ↔ Sinhala text translation for the public translator pages.
// No login and no credits: cost is bounded by a short character cap
// (higher when signed in) and a per-IP / per-user rate limit.
export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  const rateKey = user ? `translate-text:user:${user.id}` : `translate-text:ip:${clientIp(request)}`;
  if (!(await checkRateLimit(rateKey, "TRANSLATE_RATE_LIMITER"))) {
    return privateJson(
      { error: "Too many requests. Please wait a minute and try again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const limit = textLimitFor(Boolean(user));
  const input = parseTranslateTextBody(body, limit);
  if (!input.ok) {
    if (input.error === "too_long") {
      return privateJson(
        { error: `Text is too long (max ${limit} characters).`, code: "TOO_LONG", limit },
        { status: 413 }
      );
    }
    return privateJson({ error: "Missing text or direction" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return privateJson({ error: "Translation service not configured" }, { status: 500 });
  }

  try {
    const translation = await translateText(apiKey, input.text, input.direction);
    return privateJson({ translation, direction: input.direction, limit });
  } catch (err) {
    reportError(err, { route: "translate-text", userId: user?.id });
    const clientErr = toClientError(err);
    return privateJson(
      { error: clientErr.message, code: clientErr.code },
      { status: clientErr.status }
    );
  }
}
