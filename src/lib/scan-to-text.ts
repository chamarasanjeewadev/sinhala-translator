// Sinhala scan-to-text: limits and billing rules shared by the API route and the
// client. Pages are read by a multimodal Gemini vision model, so
// billing is per page: the first few pages are free, then 1 credit per page.
export const SCAN_FREE_PAGES = 3; // lifetime free pages per account
export const SCAN_CREDITS_PER_PAGE = 1;
export const SCAN_MAX_PAGES = 10; // pages per request
export const SCAN_MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const SCAN_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Split a page into free pages (from what's left of the allowance) and credits for the rest. */
export function scanCharge(freePagesUsed: number): { free: 0 | 1; credits: number } {
  return freePagesUsed < SCAN_FREE_PAGES
    ? { free: 1, credits: 0 }
    : { free: 0, credits: SCAN_CREDITS_PER_PAGE };
}

export function isScanMime(v: unknown): v is (typeof SCAN_MIME_TYPES)[number] {
  return typeof v === "string" && (SCAN_MIME_TYPES as readonly string[]).includes(v);
}

const SENTENCE_END = [".", "।", "?", "!"];

/**
 * Shorten text for TTS: prefer the last paragraph break within max, then the last
 * sentence end, else a hard cut at max.
 */
export function trimForTts(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text: text.trimEnd(), truncated: false };
  const window = text.slice(0, max);
  const para = window.lastIndexOf("\n\n");
  if (para > 0) return { text: window.slice(0, para).trimEnd(), truncated: true };
  const sentence = Math.max(...SENTENCE_END.map((p) => window.lastIndexOf(p)));
  if (sentence >= 0) return { text: window.slice(0, sentence + 1).trimEnd(), truncated: true };
  return { text: window.trimEnd(), truncated: true };
}
