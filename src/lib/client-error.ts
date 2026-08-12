export interface ApiErrorBody {
  /** Sanitized, generic message from the server (safe to display). */
  error?: string;
  /** Machine code the client maps to a localized message. */
  code?: string;
}

/**
 * Pick a localized, user-facing message for a failed API response. The server's
 * machine `code` selects a dictionary string; the server `error` is already
 * sanitized, so it is a safe fallback when no localized string exists.
 */
export function apiErrorMessage(
  data: ApiErrorBody | null | undefined,
  d: Record<string, string>,
  fallback: string
): string {
  if (data?.code === "SERVICE_BUSY" && d.serviceBusy) return d.serviceBusy;
  return data?.error || fallback;
}
