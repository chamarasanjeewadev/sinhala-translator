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
  /** Override the Gemini model (else GEMINI_MODEL env / default). */
  model?: string;
  /**
   * Gemini 3 thinking level: "minimal" | "low" | "medium" | "high". Omit/null
   * to leave the model's own default (no thinkingConfig sent).
   */
  thinkingLevel?: string | null;
}

export interface GeminiUsage {
  promptTokens: number;
  outputTokens: number;
  /** Reasoning tokens (billed at the output rate). 0 when thinking is off. */
  thoughtsTokens: number;
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
// Anti-hallucination: on short/quiet/unclear clips the model tends to "complete"
// a familiar phrase and emit words that were never spoken. Forbid that explicitly.
const TRANSCRIBE_ONLY =
  "Transcribe only the words actually spoken in the audio. Do not continue, complete, guess, or invent any words, sentences, or phrases that are not clearly heard. If the audio is short, silent, or unclear, transcribe only what is actually spoken and nothing more.";

function buildPrompt(opts: GeminiTranscribeOptions): string {
  const { conversation, timestamps, previousTail, knownSpeakers } = opts;

  if (!conversation && !timestamps) {
    // Output FORMAT (plain paragraph) is relied on by normalizeTranscriptionText
    // and existing users — keep it. The added TRANSCRIBE_ONLY clause constrains
    // content only (anti-hallucination), not format, so it's safe.
    return `${BASE_INSTRUCTION} ${TRANSCRIBE_ONLY} Return only plain paragraph text (no timestamps, no speaker labels, no bullet points, no line-by-line subtitle format). ${NO_EXTRAS}`;
  }

  const timestampRule = opts.wholeFile
    ? "a timestamp in the exact format [mm:ss] (use [h:mm:ss] past one hour) measuring elapsed time from the START of the recording"
    : "a timestamp in the exact format [mm:ss] measuring elapsed time from the START of this audio clip (the clip is at most 2 minutes, so timestamps must be between [00:00] and [02:00])";

  let prompt: string;
  if (conversation && timestamps) {
    prompt = `${BASE_INSTRUCTION} ${TRANSCRIBE_ONLY} This recording may contain multiple speakers. Put each speaker turn on its own line in the exact format "[mm:ss] Speaker N: <text>" (for example "[00:12] Speaker 1: …"), where the timestamp is ${timestampRule} and the same speaker number is used for the same voice throughout. ${NO_EXTRAS} Output nothing except the transcript lines.`;
  } else if (conversation) {
    prompt = `${BASE_INSTRUCTION} ${TRANSCRIBE_ONLY} This recording may contain multiple speakers. Put each speaker turn on its own line in the exact format "Speaker N: <text>" (for example "Speaker 1: …", "Speaker 2: …"), using the same number for the same voice throughout. Do not include timestamps. ${NO_EXTRAS} Output nothing except the labeled transcript lines.`;
  } else {
    prompt = `${BASE_INSTRUCTION} ${TRANSCRIBE_ONLY} Start each sentence or natural segment on a new line, prefixed with ${timestampRule}. Do not use speaker labels. ${NO_EXTRAS} Output nothing except the timestamped transcript lines.`;
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

  // Model + thinking level are admin-configurable (app_settings), threaded in
  // via opts; fall back to env/default. gemini-2.0-flash-exp was retired (404s).
  const modelName =
    opts.model?.trim() || process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const thinkingLevel = opts.thinkingLevel?.trim() || null;

  const contentParts = [
    { inlineData: { mimeType, data: audioBase64 } },
    buildPrompt(opts),
  ];
  // temperature 0 (argmax) sharply reduces speculative continuation on short clips.
  const baseGenConfig = { temperature: 0, topP: 0.8, topK: 40 };

  // One attempt, raced against a timeout. `thinkingConfig` isn't in the legacy
  // SDK's GenerationConfig type but IS forwarded verbatim to the v1beta API
  // (verified); all live models are Gemini-3-era and use thinkingLevel.
  const callOnce = (withThinking: boolean) => {
    const generationConfig =
      withThinking && thinkingLevel
        ? { ...baseGenConfig, thinkingConfig: { thinkingLevel } }
        : baseGenConfig;
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Transcription timeout after ${timeoutMs}ms`)),
        timeoutMs
      );
    });
    return Promise.race([model.generateContent(contentParts), timeoutPromise]);
  };

  try {
    // Never let an unsupported thinkingConfig break transcription: on a
    // thinking-related 400, retry once without it.
    const result = await callOnce(true).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (thinkingLevel && /thinking|400/i.test(msg)) {
        console.warn(
          `Gemini thinkingConfig rejected for ${modelName}; retrying without it: ${msg.slice(0, 160)}`
        );
        return callOnce(false);
      }
      throw err;
    });

    const response = await result.response;
    const text = response.text();

    const meta = response.usageMetadata;
    const usage: GeminiUsage | null = meta
      ? {
          promptTokens: meta.promptTokenCount ?? 0,
          outputTokens: meta.candidatesTokenCount ?? 0,
          thoughtsTokens:
            (meta as { thoughtsTokenCount?: number }).thoughtsTokenCount ?? 0,
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
