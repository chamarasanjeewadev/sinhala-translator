import { getCloudflareContext } from "@opennextjs/cloudflare";

interface RateLimitBinding {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export type RateLimiterBinding = "TRANSCRIBE_RATE_LIMITER" | "TRANSLATE_RATE_LIMITER";

/**
 * Best-effort rate limit via the Cloudflare Workers Rate Limiting API
 * (bindings configured in wrangler.jsonc; TRANSCRIBE_RATE_LIMITER by default).
 *
 * Fail-open: if the binding is absent (e.g. local dev / preview) or the call
 * errors, the request is allowed. Transcription must never break because of the
 * limiter — it's burst protection, not the primary cost control (credits are).
 */
export async function checkRateLimit(
  key: string,
  binding: RateLimiterBinding = "TRANSCRIBE_RATE_LIMITER"
): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    const limiter = (
      env as unknown as Partial<Record<RateLimiterBinding, RateLimitBinding>>
    )[binding];
    if (!limiter) return true;
    const { success } = await limiter.limit({ key });
    return success;
  } catch {
    return true;
  }
}
