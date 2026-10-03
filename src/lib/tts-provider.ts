/**
 * Text-to-Speech via Google Cloud TTS REST API.
 * Uses the same GOOGLE_CLOUD_API_KEY as transcription — enable the
 * "Cloud Text-to-Speech API" in Google Cloud Console if not already on.
 */

// BCP-47 language codes for TTS voices
const LANGUAGE_CODE_MAP: Record<string, string> = {
  si: "si-LK",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-BR",
  nl: "nl-NL",
  ru: "ru-RU",
  ja: "ja-JP",
  ko: "ko-KR",
  zh: "cmn-CN",
  ar: "ar-XA",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  ml: "ml-IN",
  bn: "bn-IN",
  tr: "tr-TR",
  vi: "vi-VN",
  th: "th-TH",
  id: "id-ID",
  ms: "ms-MY",
  pl: "pl-PL",
  uk: "uk-UA",
  sv: "sv-SE",
  da: "da-DK",
  fi: "fi-FI",
  nb: "nb-NO",
  cs: "cs-CZ",
  sk: "sk-SK",
  hu: "hu-HU",
  ro: "ro-RO",
  bg: "bg-BG",
  hr: "hr-HR",
  el: "el-GR",
  he: "iw-IL",
  af: "af-ZA",
  sw: "sw-TZ",
};

export function toLangCode(iso: string): string {
  return LANGUAGE_CODE_MAP[iso.toLowerCase()] ?? `${iso}-${iso.toUpperCase()}`;
}

export interface SynthesizeOptions {
  apiKey: string;
  text: string;
  /** ISO 639-1 language code, e.g. "si", "en", "es" */
  language: string;
  timeoutMs?: number;
}

export interface SynthesizeResult {
  /** Base64-encoded MP3 audio */
  audioBase64: string;
  audioMimeType: "audio/mp3";
}

/**
 * Synthesize speech from text using Google Cloud Text-to-Speech.
 * Returns base64 MP3 audio ready for playback or download.
 */
export async function synthesizeSpeech(
  opts: SynthesizeOptions
): Promise<SynthesizeResult> {
  const { apiKey, text, language, timeoutMs = 30000 } = opts;

  const languageCode = toLangCode(language);

  const body = {
    input: { text },
    voice: {
      languageCode,
      ssmlGender: "NEUTRAL",
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 0.9,
    },
  };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Cloud TTS error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as { audioContent: string };
    return { audioBase64: data.audioContent, audioMimeType: "audio/mp3" };
  } finally {
    clearTimeout(timer);
  }
}
