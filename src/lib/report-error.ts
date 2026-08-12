import * as Sentry from "@sentry/cloudflare";

/** Machine codes the client maps to a localized, user-facing message. */
export type ClientErrorCode = "SERVICE_BUSY" | "GENERATION_FAILED";

export interface ClientError {
  /** Safe, generic message — never contains provider or internal detail. */
  message: string;
  /** Code the client maps to a localized message. */
  code: ClientErrorCode;
  /** Suggested HTTP status for the response. */
  status: number;
}

interface ReportContext {
  /** Route or operation name — used as a Sentry tag. */
  route: string;
  /** Any additional structured context (userId, chunkIndex, model, …). */
  [key: string]: unknown;
}

/**
 * Log an error to Sentry (with contextual tags) and the Workers console.
 * Never throws and never rejects, so it is safe to call in a request path
 * without wrapping it in try/catch. When Sentry has no DSN (local dev /
 * preview) capture is a silent no-op.
 */
export function reportError(error: unknown, context: ReportContext): void {
  const { route, ...extra } = context;
  try {
    Sentry.captureException(error, { tags: { route }, extra });
  } catch {
    // Sentry not initialised — ignore, still logged below.
  }
  console.error(`[${route}]`, error);
}

// Provider signatures that mean "temporary — try again later", not a user
// error. Covers Gemini 429 "prepayment credits are depleted", quota exhaustion,
// rate limits, and upstream unavailability.
const SERVICE_BUSY_PATTERN =
  /\b429\b|\b503\b|too many requests|resource[_ ]?exhausted|quota|prepayment|depleted|rate.?limit|overloaded|unavailable/i;

/**
 * Map an internal error to a SAFE, generic client payload. The raw error text
 * is never surfaced — only a fixed message plus a machine code. Report the real
 * error separately via {@link reportError}.
 */
export function toClientError(
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again."
): ClientError {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (SERVICE_BUSY_PATTERN.test(raw)) {
    return {
      code: "SERVICE_BUSY",
      status: 503,
      message:
        "Our service is temporarily busy. Please try again in a few minutes.",
    };
  }
  return { code: "GENERATION_FAILED", status: 500, message: fallbackMessage };
}
