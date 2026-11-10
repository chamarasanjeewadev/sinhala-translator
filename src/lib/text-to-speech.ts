// Sinhala text-to-speech: limits, billing rule and voice list shared by the API
// route and the client tool. ~700 Sinhala characters ≈ 1 minute of speech
// (measured 10–12 chars/s on Gemini TTS: 705 chars → 56.8 s), so billing by
// characters keeps the free minute and the price predictable before any audio
// is generated.
export const TTS_FREE_CHARS = 700; // lifetime free allowance per account (≈ 1 minute)
export const TTS_CHARS_PER_CREDIT = 700; // then 1 credit per 700 chars started
// shortcut: one request, no chunking (≈ 2 min / 2 credits); chunk + stitch if users need longer.
export const TTS_MAX_CHARS = 1400;

// Gemini prebuilt voice names. Shown as "Name · style"; the style text lives in
// the dictionaries (textToSpeech.voiceStyles) so it can be localised.
export const TTS_VOICES = [
  "Kore",
  "Aoede",
  "Leda",
  "Sulafat",
  "Puck",
  "Charon",
  "Orus",
  "Achird",
] as const;

export type TtsVoice = (typeof TTS_VOICES)[number];
export const DEFAULT_TTS_VOICE: TtsVoice = "Kore";

export function isTtsVoice(value: unknown): value is TtsVoice {
  return typeof value === "string" && (TTS_VOICES as readonly string[]).includes(value);
}

/** Split a request into free characters (from what's left of the allowance) and credits for the rest. */
export function ttsCharge(chars: number, freeUsed: number): { free: number; credits: number } {
  const freeLeft = Math.max(0, TTS_FREE_CHARS - freeUsed);
  const free = Math.min(chars, freeLeft);
  return { free, credits: Math.ceil((chars - free) / TTS_CHARS_PER_CREDIT) };
}
