import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Transcribe audio using Google's Gemini model with timeout
 * @param apiKey - Google AI API key
 * @param audioBase64 - Base64-encoded audio data
 * @param mimeType - MIME type of the audio (e.g., "audio/wav")
 * @param timeoutMs - Timeout in milliseconds (default: 30 seconds)
 * @returns Transcribed text
 */
export async function transcribeWithGemini(
  apiKey: string,
  audioBase64: string,
  mimeType: string = "audio/wav",
  timeoutMs: number = 60000 // 60 seconds for 2-minute chunks
): Promise<string> {
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
      "Please transcribe the following audio recording into Sinhala text accurately. Do not add any interpretations or summaries, just provide the exact transcription of the spoken Sinhala words.",
    ]);

    const result = await Promise.race([transcriptionPromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini transcription error: ${error.message}`);
    }
    throw new Error("Gemini transcription failed");
  }
}
