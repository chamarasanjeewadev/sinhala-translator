import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Translate Sinhala text to English using Google's Gemini model.
 * Produces a verbatim, one-to-one translation with no summarisation.
 */
export async function translateWithGemini(
  apiKey: string,
  sinhalaText: string,
  timeoutMs: number = 30000
): Promise<string> {
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure GOOGLE_CLOUD_API_KEY is configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0,
      topP: 1,
      topK: 1,
    },
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
