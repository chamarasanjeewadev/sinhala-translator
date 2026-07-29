import { getCloudflareContext } from "@opennextjs/cloudflare";

interface RateLimitBinding {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Best-effort per-user rate limit via the Cloudflare Workers Rate Limiting API
 * (binding TRANSCRIBE_RATE_LIMITER, configured in wrangler.jsonc).
 *
 * Fail-open: if the binding is absent (e.g. local dev / preview) or the call
 * errors, the request is allowed. Transcription must never break because of the
 * limiter — it's burst protection, not the primary cost control (credits are).
 */
export async function checkRateLimit(key: string): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    const limiter = (
      env as unknown as { TRANSCRIBE_RATE_LIMITER?: RateLimitBinding }
    ).TRANSCRIBE_RATE_LIMITER;
    if (!limiter) return true;
    const { success } = await limiter.limit({ key });
    return success;
  } catch {
    return true;
  }
}
