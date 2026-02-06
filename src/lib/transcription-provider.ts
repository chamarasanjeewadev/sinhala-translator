import { transcribeChunk as transcribeWithSpeechToText } from "./speech-to-text";
import { transcribeWithGemini } from "./gemini-transcribe";

export type TranscriptionProvider = "gemini" | "speech-to-text";

interface TranscribeOptions {
  apiKey: string;
  audioBase64: string;
  sampleRateHertz?: number;
  mimeType?: string;
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
 * @returns Transcribed text
 */
export async function transcribeAudio(
  options: TranscribeOptions
): Promise<string> {
  const provider = getTranscriptionProvider();

  if (provider === "gemini") {
    const mimeType = options.mimeType || "audio/wav";
    return transcribeWithGemini(options.apiKey, options.audioBase64, mimeType);
  }

  // Use Google Speech-to-Text API
  const sampleRate = options.sampleRateHertz || 16000;
  return transcribeWithSpeechToText(
    options.apiKey,
    options.audioBase64,
    sampleRate
  );
}
