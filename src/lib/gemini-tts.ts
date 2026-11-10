import type { TtsVoice } from "@/lib/text-to-speech";

/**
 * Sinhala speech via Gemini TTS over REST (works on Cloudflare Workers, uses the
 * same GOOGLE_CLOUD_API_KEY as the other Gemini calls). The classic Cloud
 * Text-to-Speech API has no Sinhala voice, so it cannot be used here.
 */
const DEFAULT_TTS_MODEL = "gemini-3.8-flash-lite-tts";
const ATTEMPTS = 2; // the model occasionally returns no audio — one retry
const SAMPLE_RATE = 24000;

export interface TtsResult {
  /** Complete WAV file (24 kHz, mono, 16-bit). */
  wav: Uint8Array;
  seconds: number;
  model: string;
}

/** Gemini returns a finished WAV for unary calls; only wrap raw PCM if it didn't. */
export function toWav(bytes: Uint8Array, sampleRate = SAMPLE_RATE): Uint8Array {
  const enc = new TextEncoder();
  if (bytes.length > 44 && new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF") return bytes;
  const out = new Uint8Array(44 + bytes.length);
  const v = new DataView(out.buffer);
  out.set(enc.encode("RIFF"), 0);
  v.setUint32(4, 36 + bytes.length, true);
  out.set(enc.encode("WAVEfmt "), 8);
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  out.set(enc.encode("data"), 36);
  v.setUint32(40, bytes.length, true);
  out.set(bytes, 44);
  return out;
}

export function wavSeconds(wav: Uint8Array): number {
  const byteRate = new DataView(wav.buffer, wav.byteOffset, wav.byteLength).getUint32(28, true);
  return byteRate ? (wav.length - 44) / byteRate : 0;
}

export async function synthesizeSinhalaSpeech(opts: {
  apiKey: string;
  text: string;
  voice: TtsVoice;
  timeoutMs?: number;
}): Promise<TtsResult> {
  const { apiKey, text, voice, timeoutMs = 90000 } = opts;
  if (!apiKey) throw new Error("API Key is missing. Please ensure GOOGLE_CLOUD_API_KEY is configured.");
  const model = process.env.GEMINI_TTS_MODEL || DEFAULT_TTS_MODEL;
  const body = JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body,
          signal: ac.signal,
        }
      );
      if (!res.ok) {
        const err = new Error(`Gemini TTS error ${res.status}: ${(await res.text()).slice(0, 300)}`);
        // Retrying a bad request / auth failure just pays for the same failure.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) throw Object.assign(err, { fatal: true });
        throw err;
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
      };
      const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
      if (!b64) throw new Error("Gemini TTS returned no audio");
      const wav = toWav(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      const seconds = wavSeconds(wav);
      if (seconds < 0.3) throw new Error("Gemini TTS returned empty audio");
      return { wav, seconds, model };
    } catch (err) {
      lastError = err;
      if ((err as { fatal?: boolean }).fatal) break;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
