import { transcribeChunk as transcribeWithSpeechToText } from "./speech-to-text";
import { transcribeWithGemini, type GeminiUsage } from "./gemini-transcribe";
import {
  normalizeStructuredTranscription,
  normalizeTranscriptionText,
} from "./transcription-format";

export type TranscriptionProvider = "gemini" | "speech-to-text";

interface TranscribeOptions {
  apiKey: string;
  audioBase64: string;
  sampleRateHertz?: number;
  mimeType?: string;
  conversation?: boolean;
  timestamps?: boolean;
  previousTail?: string;
  knownSpeakers?: string[];
  /** Audio is a complete recording, not a 2-minute chunk (mobile flow) */
  wholeFile?: boolean;
  timeoutMs?: number;
}

export interface TranscribeResult {
  text: string;
  model: string;
  usage: GeminiUsage | null;
}

/**
 * Get the configured transcription provider from environment variables
 * Defaults to "gemini" if not specified
 */
export function getTranscriptionProvider(): TranscriptionProvider {
  const provider = process.env.TRANSCRIPTION_PROVIDER?.toLowerCase();

  if (provider === "speech-to-text") {
    return "speech-to-text";
  }

  // Default to Gemini
  return "gemini";
}

/**
 * Transcribe audio using the configured provider
 * @param options - Transcription options
 * @returns Transcribed text plus model name and token usage (Gemini only)
 */
export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscribeResult> {
  const provider = getTranscriptionProvider();
  const structured = options.conversation || options.timestamps;

  if (provider === "gemini") {
    const result = await transcribeWithGemini({
      apiKey: options.apiKey,
      audioBase64: options.audioBase64,
      mimeType: options.mimeType || "audio/wav",
      conversation: options.conversation,
      timestamps: options.timestamps,
      previousTail: options.previousTail,
      knownSpeakers: options.knownSpeakers,
      wholeFile: options.wholeFile,
      timeoutMs: options.timeoutMs,
    });
    const text = structured
      ? normalizeStructuredTranscription(result.text)
      : normalizeTranscriptionText(result.text);
    return { text, model: result.model, usage: result.usage };
  }

  // Use Google Speech-to-Text API (no diarization/timestamp support)
  const sampleRate = options.sampleRateHertz || 16000;
  const text = await transcribeWithSpeechToText(
    options.apiKey,
    options.audioBase64,
    sampleRate
  );
  return {
    text: normalizeTranscriptionText(text),
    model: "speech-to-text",
    usage: null,
  };
}
