import type { TranslateDirection } from "@/lib/gemini-translate";

// Free public English ↔ Sinhala text translator limits. Shared by the API
// routes and the client tool so the counters and server checks agree.
export const ANON_TEXT_LIMIT = 500;
export const SIGNED_IN_TEXT_LIMIT = 5000;
export const SPEECH_TEXT_LIMIT = 1000;

export function textLimitFor(signedIn: boolean): number {
  return signedIn ? SIGNED_IN_TEXT_LIMIT : ANON_TEXT_LIMIT;
}

export type TranslateTextInput =
  | { ok: true; text: string; direction: TranslateDirection }
  | { ok: false; error: "missing_text" | "bad_direction" | "too_long" };

/** Validate a /api/translate-text body against the caller's character limit. */
export function parseTranslateTextBody(body: unknown, limit: number): TranslateTextInput {
  const { text, direction } = (body ?? {}) as { text?: unknown; direction?: unknown };
  if (direction !== "en-si" && direction !== "si-en") return { ok: false, error: "bad_direction" };
  if (typeof text !== "string" || text.trim() === "") return { ok: false, error: "missing_text" };
  const trimmed = text.trim();
  if (trimmed.length > limit) return { ok: false, error: "too_long" };
  return { ok: true, text: trimmed, direction };
}

/** Client IP on Cloudflare, used to key the anonymous rate limit. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
