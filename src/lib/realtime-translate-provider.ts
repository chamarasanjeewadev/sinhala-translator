import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";

export type TranslateAudioProvider = "gemini" | "openai";

export interface TranslateAudioOptions {
  provider: TranslateAudioProvider;
  geminiApiKey: string;
  openaiApiKey?: string;
  audioBase64: string;
  mimeType?: string;
  /**
   * ISO 639-1 code of the non-Sinhala language in the conversation (e.g. "en",
   * "es", "ta"). The provider detects which side the user spoke and translates
   * to the opposite side automatically.
   */
  foreignLanguage: string;
  model?: string;
  timeoutMs?: number;
}

export interface TranslateAudioResult {
  /** Translated text (in the language opposite to what was detected). */
  translatedText: string;
  /** ISO 639-1 code of the detected language ("si" or the foreignLanguage). */
  detectedLanguage: string;
  /** ISO 639-1 code of the output language. */
  targetLanguage: string;
  model: string;
}

// Human-readable language names for prompts
const LANGUAGE_NAMES: Record<string, string> = {
  si: "Sinhala",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Mandarin Chinese",
  ar: "Arabic",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  bn: "Bengali",
  tr: "Turkish",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
  pl: "Polish",
  sv: "Swedish",
};

export function languageName(iso: string): string {
  return LANGUAGE_NAMES[iso.toLowerCase()] ?? iso.toUpperCase();
}

const TRANSLATE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    detectedLanguage: { type: SchemaType.STRING },
    originalText: { type: SchemaType.STRING },
    translatedText: { type: SchemaType.STRING },
  },
  required: ["detectedLanguage", "originalText", "translatedText"],
};

export async function translateAudioBidirectional(
  options: TranslateAudioOptions
): Promise<TranslateAudioResult> {
  if (options.provider === "openai") {
    return translateWithOpenAI(options);
  }
  return translateWithGemini(options);
}

// ─── Gemini — single call: STT + language detect + translate ─────────────────

async function translateWithGemini(
  options: TranslateAudioOptions
): Promise<TranslateAudioResult> {
  const {
    geminiApiKey,
    audioBase64,
    mimeType = "audio/mp4",
    foreignLanguage,
    model,
    timeoutMs = 60000,
  } = options;

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const modelName = model ?? process.env.GEMINI_MODEL ?? "gemini-flash-latest";
  const geminiModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: TRANSLATE_SCHEMA,
    },
  });

  const foreignName = languageName(foreignLanguage);

  const prompt = `You are a real-time interpreter between ${foreignName} and Sinhala (සිංහල).

The audio contains speech in EITHER ${foreignName} OR Sinhala.

Instructions:
1. Transcribe what was spoken exactly.
2. Identify which language was spoken.
3. Translate to the OPPOSITE language:
   - If spoken in ${foreignName} → translate to Sinhala
   - If spoken in Sinhala → translate to ${foreignName}

Return a JSON object with:
- "detectedLanguage": ISO 639-1 code of what was spoken ("${foreignLanguage}" or "si")
- "originalText": verbatim transcription in the original language
- "translatedText": the full translation in the opposite language

If the audio is silent or unclear, return empty strings for originalText and translatedText.`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Gemini translate timeout after ${timeoutMs}ms`)),
      timeoutMs
    )
  );

  const result = await Promise.race([
    geminiModel.generateContent([
      { text: prompt },
      { inlineData: { mimeType, data: audioBase64 } },
    ]),
    timeoutPromise,
  ]);

  const response = await result.response;
  const parsed = JSON.parse(response.text()) as {
    detectedLanguage: string;
    originalText: string;
    translatedText: string;
  };

  const detectedLanguage = parsed.detectedLanguage?.toLowerCase() || foreignLanguage;
  const targetLanguage = detectedLanguage === "si" ? foreignLanguage : "si";

  return {
    translatedText: parsed.translatedText?.trim() ?? "",
    detectedLanguage,
    targetLanguage,
    model: modelName,
  };
}

// ─── OpenAI — Whisper STT + GPT-4o-mini translation ─────────────────────────

async function translateWithOpenAI(
  options: TranslateAudioOptions
): Promise<TranslateAudioResult> {
  const {
    openaiApiKey,
    audioBase64,
    mimeType = "audio/mp4",
    foreignLanguage,
    model = "whisper-1",
    timeoutMs = 60000,
  } = options;

  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured (set OPENAI_API_KEY)");
  }

  // Step 1: Whisper transcription — auto-detects language
  const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const audioFile = new File([audioBytes], "audio.m4a", { type: mimeType });
  const formData = new FormData();
  formData.append("file", audioFile);
  formData.append("model", model);

  const ac1 = new AbortController();
  const t1 = setTimeout(() => ac1.abort(), timeoutMs);

  let sourceText: string;
  let detectedLanguage: string;
  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiApiKey}` },
      body: formData,
      signal: ac1.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Whisper API error ${res.status}: ${body}`);
    }
    // Request language detection via verbose_json
    const data = (await res.json()) as { text: string; language?: string };
    sourceText = data.text?.trim() ?? "";
    detectedLanguage = data.language?.toLowerCase() || foreignLanguage;
  } finally {
    clearTimeout(t1);
  }

  if (!sourceText) {
    return {
      translatedText: "",
      detectedLanguage: foreignLanguage,
      targetLanguage: "si",
      model: `${model}+gpt-4o-mini`,
    };
  }

  const targetLanguage = detectedLanguage === "si" ? foreignLanguage : "si";
  const targetName = languageName(targetLanguage);

  // Step 2: Translate
  const chatModel = "gpt-4o-mini";
  const ac2 = new AbortController();
  const t2 = setTimeout(() => ac2.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chatModel,
        messages: [
          {
            role: "system",
            content: `Translate the given text into ${targetName}. Output ONLY the translation — no explanations.`,
          },
          { role: "user", content: sourceText },
        ],
        temperature: 0,
      }),
      signal: ac2.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GPT translate error ${res.status}: ${body}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return {
      translatedText: data.choices[0]?.message?.content?.trim() ?? "",
      detectedLanguage,
      targetLanguage,
      model: `${model}+${chatModel}`,
    };
  } finally {
    clearTimeout(t2);
  }
}
