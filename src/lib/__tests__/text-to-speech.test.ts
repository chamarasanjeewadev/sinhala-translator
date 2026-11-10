import { describe, expect, it } from "vitest";
import {
  TTS_CHARS_PER_CREDIT,
  TTS_FREE_CHARS,
  TTS_VOICES,
  isTtsVoice,
  ttsCharge,
} from "../text-to-speech";
import { toWav, wavSeconds } from "../gemini-tts";

const F = TTS_FREE_CHARS;
const C = TTS_CHARS_PER_CREDIT;

describe("ttsCharge", () => {
  it("covers a short text entirely from the free allowance", () => {
    expect(ttsCharge(300, 0)).toEqual({ free: 300, credits: 0 });
    expect(ttsCharge(F, 0)).toEqual({ free: F, credits: 0 });
  });

  it("charges the part beyond what's left, rounded up to started blocks", () => {
    expect(ttsCharge(F + C, 0)).toEqual({ free: F, credits: 1 });
    expect(ttsCharge(F, F - 100)).toEqual({ free: 100, credits: 1 }); // 100 free left, rest → 1 credit
    expect(ttsCharge(C + 1, F)).toEqual({ free: 0, credits: 2 });
  });

  it("charges everything once the allowance is spent", () => {
    expect(ttsCharge(C, F)).toEqual({ free: 0, credits: 1 });
    expect(ttsCharge(100, F + 50)).toEqual({ free: 0, credits: 1 });
  });
});

describe("isTtsVoice", () => {
  it("accepts only the curated voices", () => {
    for (const v of TTS_VOICES) expect(isTtsVoice(v)).toBe(true);
    expect(isTtsVoice("Zephyr")).toBe(false);
    expect(isTtsVoice(undefined)).toBe(false);
  });
});

describe("toWav", () => {
  const pcm = new Uint8Array(48000); // 1 s of 24 kHz mono 16-bit

  it("wraps raw PCM in a WAV header", () => {
    const wav = toWav(pcm);
    expect(new TextDecoder().decode(wav.subarray(0, 4))).toBe("RIFF");
    expect(wav.length).toBe(44 + pcm.length);
    expect(wavSeconds(wav)).toBeCloseTo(1, 5);
  });

  it("leaves an existing WAV untouched (Gemini returns a finished file)", () => {
    const wav = toWav(pcm);
    expect(toWav(wav)).toBe(wav);
  });
});
