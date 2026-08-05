import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";

/**
 * Translate Sinhala text to English using Google's Gemini model.
 * Produces a verbatim, one-to-one translation with no summarisation.
 */
export async function translateWithGemini(
  apiKey: string,
  sinhalaText: string,
  timeoutMs: number = 60000
): Promise<string> {
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure GOOGLE_CLOUD_API_KEY is configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";

  // No generationConfig: Gemini 3 thinking models loop indefinitely when
  // temperature is lowered below the 1.0 default — keep model defaults.
  const model = genAI.getGenerativeModel({
    model: modelName,
  });

  const prompt = `You are a professional Sinhala-to-English translator.

Translate the following Sinhala text into English.

Rules:
- Produce a verbatim, sentence-by-sentence, one-to-one translation.
- Preserve the original structure, paragraph breaks, and punctuation as closely as possible.
- Do NOT summarise, paraphrase, restructure, or condense the content.
- Do NOT add bullet points, headings, commentary, or explanations.
- Output ONLY the English translation and nothing else.

Sinhala text:
${sinhalaText}`;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Translation timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise,
    ]);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini translation error: ${error.message}`);
    }
    throw new Error("Gemini translation failed");
  }
}

export type TranslateDirection = "si-en" | "en-si";

const TRANSLATIONS_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: { type: SchemaType.STRING },
};

/**
 * Translate an ordered batch of subtitle segment texts, preserving array
 * length and order (JSON mode). Used by the video-subtitles editor so segment
 * timings can be kept while only the text is swapped.
 */
export async function translateSegments(
  apiKey: string,
  texts: string[],
  direction: TranslateDirection,
  timeoutMs: number = 90000
): Promise<string[]> {
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure GOOGLE_CLOUD_API_KEY is configured.");
  }
  if (texts.length === 0) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";

  // Same as translateWithGemini: keep model-default sampling params.
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: TRANSLATIONS_SCHEMA,
    },
  });

  const from = direction === "si-en" ? "Sinhala" : "English";
  const to = direction === "si-en" ? "English" : "Sinhala";

  const prompt = `You are a professional ${from}-to-${to} translator.

The JSON array below contains consecutive subtitle segments from one video, in order.
Translate each segment into ${to}.

Rules:
- Return a JSON array of strings with EXACTLY the same number of elements, where element N is the translation of segment N.
- Translate each segment on its own, but use the surrounding segments for context.
- Keep translations short and subtitle-friendly; preserve any line break (\\n) inside a segment.
- Do NOT merge, split, reorder, summarise, or annotate segments.

Segments:
${JSON.stringify(texts)}`;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Translation timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise,
    ]);
    const response = await result.response;
    const parsed: unknown = JSON.parse(response.text());
    if (
      !Array.isArray(parsed) ||
      parsed.length !== texts.length ||
      !parsed.every((item) => typeof item === "string")
    ) {
      throw new Error("Model returned a mismatched translation array");
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini translation error: ${error.message}`);
    }
    throw new Error("Gemini translation failed");
  }
}
