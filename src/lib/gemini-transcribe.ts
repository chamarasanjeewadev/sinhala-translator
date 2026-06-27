import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiTranscribeOptions {
  apiKey: string;
  audioBase64: string;
  mimeType?: string;
  timeoutMs?: number;
  /** Label speaker turns ("Speaker 1: …") for multi-speaker recordings */
  conversation?: boolean;
  /** Prefix segments with [mm:ss] markers relative to the clip start */
  timestamps?: boolean;
  /** Tail of the transcript so far (conversation mode chunk continuity) */
  previousTail?: string;
  /** Speaker labels already used, e.g. ["Speaker 1", "Speaker 2"] */
  knownSpeakers?: string[];
  /**
   * The audio is a complete recording rather than a 2-minute chunk
   * (mobile whole-file flow) — timestamps are absolute, no offsetting.
   */
  wholeFile?: boolean;
}

export interface GeminiUsage {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface GeminiTranscribeResult {
  text: string;
  model: string;
  usage: GeminiUsage | null;
}

const BASE_INSTRUCTION =
  "Please transcribe the following audio recording into Sinhala text accurately.";
const NO_EXTRAS = "Do not add any interpretations or summaries.";

function buildPrompt(opts: GeminiTranscribeOptions): string {
  const { conversation, timestamps, previousTail, knownSpeakers } = opts;

  if (!conversation && !timestamps) {
    // Must stay byte-identical to the original prompt — default mode output
    // is relied on by normalizeTranscriptionText and existing users.
    return `${BASE_INSTRUCTION} Return only plain paragraph text (no timestamps, no speaker labels, no bullet points, no line-by-line subtitle format). ${NO_EXTRAS}`;
  }

  const timestampRule = opts.wholeFile
    ? "a timestamp in the exact format [mm:ss] (use [h:mm:ss] past one hour) measuring elapsed time from the START of the recording"
    : "a timestamp in the exact format [mm:ss] measuring elapsed time from the START of this audio clip (the clip is at most 2 minutes, so timestamps must be between [00:00] and [02:00])";

  let prompt: string;
  if (conversation && timestamps) {
    prompt = `${BASE_INSTRUCTION} This recording may contain multiple speakers. Put each speaker turn on its own line in the exact format "[mm:ss] Speaker N: <text>" (for example "[00:12] Speaker 1: …"), where the timestamp is ${timestampRule} and the same speaker number is used for the same voice throughout. ${NO_EXTRAS} Output nothing except the transcript lines.`;
  } else if (conversation) {
    prompt = `${BASE_INSTRUCTION} This recording may contain multiple speakers. Put each speaker turn on its own line in the exact format "Speaker N: <text>" (for example "Speaker 1: …", "Speaker 2: …"), using the same number for the same voice throughout. Do not include timestamps. ${NO_EXTRAS} Output nothing except the labeled transcript lines.`;
  } else {
    prompt = `${BASE_INSTRUCTION} Start each sentence or natural segment on a new line, prefixed with ${timestampRule}. Do not use speaker labels. ${NO_EXTRAS} Output nothing except the timestamped transcript lines.`;
  }

  if (conversation && (previousTail || knownSpeakers?.length)) {
    const speakers = knownSpeakers?.length
      ? ` Speakers identified so far: ${knownSpeakers.join(", ")}.`
      : "";
    const tail = previousTail
      ? ` The transcript so far ends with: «${previousTail}».`
      : "";
    prompt += ` This clip is a continuation of a longer recording.${speakers}${tail} Keep using the SAME speaker numbers for the same voices. If a genuinely new voice appears, use the next unused number.`;
  }

  return prompt;
}

/**
 * Transcribe audio using Google's Gemini model with timeout
 */
export async function transcribeWithGemini(
  opts: GeminiTranscribeOptions
): Promise<GeminiTranscribeResult> {
  const {
    apiKey,
    audioBase64,
    mimeType = "audio/wav",
    timeoutMs = 60000, // 60 seconds for 2-minute chunks
  } = opts;

  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure GOOGLE_CLOUD_API_KEY is configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use gemini-2.0-flash-exp by default (configurable via env var)
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
      },
    });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Transcription timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Race between API call and timeout
    const transcriptionPromise = model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
      buildPrompt(opts),
    ]);

    const result = await Promise.race([transcriptionPromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text();

    const meta = response.usageMetadata;
    const usage: GeminiUsage | null = meta
      ? {
          promptTokens: meta.promptTokenCount ?? 0,
          outputTokens: meta.candidatesTokenCount ?? 0,
          totalTokens: meta.totalTokenCount ?? 0,
        }
      : null;

    return { text: text.trim(), model: modelName, usage };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini transcription error: ${error.message}`);
    }
    throw new Error("Gemini transcription failed");
  }
}
