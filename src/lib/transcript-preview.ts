// Download gate: users who have never purchased credits (or redeemed a promo)
// see a preview of their transcripts only. Truncating server-side — both in the
// dashboard server component and the /api/transcriptions GET route — keeps the
// full text off the client so the paywall can't be bypassed via devtools.

export const TRANSCRIPT_PREVIEW_CHARS = 200;

function toPreview(text: string | null): string | null {
  return text && text.length > TRANSCRIPT_PREVIEW_CHARS
    ? text.slice(0, TRANSCRIPT_PREVIEW_CHARS) + "…"
    : text;
}

/**
 * Truncate transcript + translation text to a preview when the user hasn't
 * unlocked exports. Returns the rows unchanged for purchasers.
 */
export function gateTranscriptions<
  T extends { transcription_text: string; english_translation: string | null }
>(rows: T[], hasPurchased: boolean): T[] {
  if (hasPurchased) return rows;
  return rows.map((t) => ({
    ...t,
    transcription_text: toPreview(t.transcription_text) ?? t.transcription_text,
    english_translation: toPreview(t.english_translation),
  }));
}
