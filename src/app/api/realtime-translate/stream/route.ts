import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClientFromRequest } from "@/lib/supabase/request";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTranslateConfig } from "@/lib/app-settings";
import { reportError } from "@/lib/report-error";
import {
  languageName,
  translateAudioBidirectional,
} from "@/lib/realtime-translate-provider";

// A streaming "continuous" translate: the client sends short rolling audio
// windows and receives the translation word-by-word over SSE. Billing matches
// the non-streaming route — 1 credit per window, charged only after the model
// actually produces text (silent/unclear windows are free).
const CREDITS_PER_CALL = 1;
const MAX_BASE64_CHARS = 19.5 * 1024 * 1024;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Disable proxy buffering so events flush immediately.
  "X-Accel-Buffering": "no",
};

const encoder = new TextEncoder();

function sseLine(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

/** A one-shot SSE response carrying a single event (used for early errors). */
function sseError(data: object, status: number): Response {
  return new Response(`data: ${JSON.stringify(data)}\n\n`, {
    status,
    headers: SSE_HEADERS,
  });
}

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);
  if (!user) return sseError({ error: "Unauthorized" }, 401);

  if (!(await checkRateLimit(`realtime-translate:${user.id}`))) {
    return sseError({ error: "Too many requests" }, 429);
  }

  let body: {
    audio?: string;
    mimeType?: string;
    /** ISO 639-1 code of the non-Sinhala language in the session (output pair). */
    foreignLanguage?: string;
  };
  try {
    body = await request.json();
  } catch {
    return sseError({ error: "Invalid request body" }, 400);
  }

  const audio = body.audio;
  const mimeType = body.mimeType || "audio/mp4";
  const foreignLanguage = (body.foreignLanguage || "en").toLowerCase();

  if (!audio || typeof audio !== "string") {
    return sseError({ error: "Missing audio" }, 400);
  }
  if (audio.length > MAX_BASE64_CHARS) {
    return sseError({ error: "Audio too large" }, 413);
  }

  // Pre-flight credit check (atomic deduction happens after a successful result).
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (!profile || profile.credits < CREDITS_PER_CALL) {
    return sseError(
      {
        error: "Insufficient credits",
        creditsNeeded: CREDITS_PER_CALL,
        creditsAvailable: profile?.credits ?? 0,
      },
      402
    );
  }

  const config = await getTranslateConfig();
  const geminiApiKey = process.env.GOOGLE_CLOUD_API_KEY ?? "";
  const foreignName = languageName(foreignLanguage);

  // Deduct 1 credit, returning the new balance or null on failure (e.g. the
  // balance was drained concurrently between the pre-flight check and here).
  const deductCredit = async (): Promise<number | null> => {
    const { data, error } = await supabase.rpc("deduct_n_credits", {
      p_user_id: user.id,
      p_amount: CREDITS_PER_CALL,
      p_description: "Live translate (streaming)",
    });
    if (error || !data?.[0]?.success) return null;
    return data[0].credits_remaining as number;
  };

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let producedText = false;
      let detectedLanguage = foreignLanguage;

      const emit = (data: object) => controller.enqueue(sseLine(data));

      try {
        if (config.provider === "openai") {
          // Whisper has no token streaming — translate fully, then emit once.
          const result = await translateAudioBidirectional({
            provider: "openai",
            geminiApiKey,
            openaiApiKey: config.openaiApiKey,
            audioBase64: audio,
            mimeType,
            foreignLanguage,
            model: config.model,
          });
          detectedLanguage = result.detectedLanguage;
          if (result.translatedText) {
            producedText = true;
            emit({ text: result.translatedText });
          }
        } else {
          // Gemini: true word-by-word streaming.
          const modelName = config.model || "gemini-flash-latest";
          const genAI = new GoogleGenerativeAI(geminiApiKey);
          const model = genAI.getGenerativeModel({ model: modelName });

          const prompt = `You are a real-time interpreter between ${foreignName} and Sinhala (සිංහල).

The audio contains continuous speech in EITHER ${foreignName} OR Sinhala.

Instructions:
- Identify which language was spoken.
- If the speaker used ${foreignName}, output ONLY the Sinhala translation.
- If the speaker used Sinhala, output ONLY the ${foreignName} translation.
- Output the translation naturally and continuously as you go.
- Your response MUST begin with exactly "LANG:${foreignLanguage}" or "LANG:si" (the language you detected), followed by a newline, then the translation.
- Do not include the original spoken text, quotes, explanations, or any other commentary.
- If the audio is silent or unintelligible, output just "LANG:${foreignLanguage}" followed by a newline and nothing else.`;

          const streamResult = await model.generateContentStream([
            { text: prompt },
            { inlineData: { mimeType, data: audio } },
          ]);

          // The first line is a "LANG:xx" header we strip before forwarding.
          let headerDone = false;
          let headerBuffer = "";

          for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            if (!text) continue;

            if (headerDone) {
              producedText = true;
              emit({ text });
              continue;
            }

            headerBuffer += text;

            // Does the buffer still look like it could be the "LANG:" header?
            const couldBeHeader =
              headerBuffer.startsWith("LANG:") ||
              "LANG:".startsWith(headerBuffer);

            if (!couldBeHeader) {
              // Model skipped the header — treat everything as translation.
              headerDone = true;
              producedText = true;
              emit({ text: headerBuffer });
              headerBuffer = "";
              continue;
            }

            const nlIdx = headerBuffer.indexOf("\n");
            if (nlIdx !== -1) {
              const headerLine = headerBuffer.slice(0, nlIdx);
              const match = headerLine.match(/^LANG:(\w+)/);
              if (match) detectedLanguage = match[1].toLowerCase();
              headerDone = true;
              const remainder = headerBuffer.slice(nlIdx + 1);
              headerBuffer = "";
              if (remainder.trim()) {
                producedText = true;
                emit({ text: remainder });
              }
            }
            // else: keep buffering until we see the newline.
          }
        }
      } catch (err) {
        reportError(err, {
          route: "realtime-translate/stream",
          userId: user.id,
          provider: config.provider,
        });
        emit({ error: "Translation failed" });
        // Fall through to the done event so the client always terminates.
      }

      const targetLanguage = detectedLanguage === "si" ? foreignLanguage : "si";

      // Charge only when we actually produced a translation.
      let creditsUsed = 0;
      let creditsRemaining = profile.credits;
      if (producedText) {
        const remaining = await deductCredit();
        if (remaining !== null) {
          creditsUsed = CREDITS_PER_CALL;
          creditsRemaining = remaining;
        } else {
          creditsRemaining = Math.max(0, profile.credits - CREDITS_PER_CALL);
        }
      }

      emit({
        done: true,
        detectedLanguage,
        targetLanguage,
        creditsUsed,
        creditsRemaining,
      });
      controller.close();
    },
  });

  return new Response(readable, { headers: SSE_HEADERS });
}
