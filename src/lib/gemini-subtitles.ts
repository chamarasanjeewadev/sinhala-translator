import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import type { GeminiUsage } from "./gemini-transcribe";
import type { SubtitleLanguage } from "./types";

export interface GeminiSubtitleOptions {
  apiKey: string;
  audioBase64: string;
  /** Duration of this clip in seconds — bounds the timestamps in the prompt */
  chunkDurationSec: number;
  language?: SubtitleLanguage;
  mimeType?: string;
  timeoutMs?: number;
}

export interface GeminiSubtitleResult {
  /** Parsed JSON from the model — raw, unvalidated segment objects */
  rawSegments: unknown;
  model: string;
  usage: GeminiUsage | null;
}

const SEGMENT_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      start: {
        type: SchemaType.NUMBER,
        description: "Segment start time in seconds from the start of this clip",
      },
      end: {
        type: SchemaType.NUMBER,
        description: "Segment end time in seconds from the start of this clip",
      },
      text: { type: SchemaType.STRING, description: "Subtitle text" },
    },
    required: ["start", "end", "text"],
  },
};

function languageRule(language: SubtitleLanguage): string {
  switch (language) {
    case "si":
      return "The audio is in Sinhala. Transcribe it in Sinhala script.";
    case "en":
      return "The audio is in English. Transcribe it in English.";
    default:
      return "Transcribe in the language actually spoken (Sinhala in Sinhala script, or English in English).";
  }
}

function buildPrompt(opts: GeminiSubtitleOptions): string {
  const duration = Math.ceil(opts.chunkDurationSec);
  return (
    `Transcribe this audio clip into subtitle segments. ${languageRule(opts.language ?? "si")} ` +
    `Return a JSON array of segments, each with "start" and "end" times in seconds ` +
    `(decimals allowed) measured from the START of this clip, and the spoken "text". ` +
    `Rules: every segment must satisfy 0 <= start < end <= ${duration}. ` +
    `Each segment should cover one spoken phrase or sentence, between 1 and 7 seconds long. ` +
    `Keep text at most 42 characters per line and at most 2 lines; if a segment needs ` +
    `two lines, separate them with a single \\n. Split long sentences into multiple ` +
    `segments at natural phrase boundaries. Segments must not overlap and must be in ` +
    `chronological order. Align start/end times to when the words are actually spoken. ` +
    `Do not add interpretations, summaries, or speaker labels. ` +
    `If the clip contains no speech, return an empty array [].`
  );
}

/**
 * Generate timed subtitle segments for one audio chunk using Gemini in JSON
 * mode. The response schema forces [{start, end, text}] shape; contents are
 * still validated server-side by normalizeSegments().
 */
export async function generateSubtitlesWithGemini(
  opts: GeminiSubtitleOptions
): Promise<GeminiSubtitleResult> {
  const {
    apiKey,
    audioBase64,
    mimeType = "audio/wav",
    timeoutMs = 60000,
  } = opts;

  if (!apiKey) {
    throw new Error(
      "API Key is missing. Please ensure GOOGLE_CLOUD_API_KEY is configured."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        responseMimeType: "application/json",
        responseSchema: SEGMENT_SCHEMA,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Subtitle generation timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const generationPromise = model.generateContent([
      { inlineData: { mimeType, data: audioBase64 } },
      buildPrompt(opts),
    ]);

    const result = await Promise.race([generationPromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text();

    let rawSegments: unknown;
    try {
      rawSegments = JSON.parse(text);
    } catch {
      throw new Error("Model returned invalid JSON");
    }

    const meta = response.usageMetadata;
    const usage: GeminiUsage | null = meta
      ? {
          promptTokens: meta.promptTokenCount ?? 0,
          outputTokens: meta.candidatesTokenCount ?? 0,
          totalTokens: meta.totalTokenCount ?? 0,
        }
      : null;

    return { rawSegments, model: modelName, usage };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini subtitle error: ${error.message}`);
    }
    throw new Error("Gemini subtitle generation failed");
  }
}
