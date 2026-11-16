/**
 * Sinhala page-to-text with Gemini vision over REST (Cloudflare Workers safe:
 * fetch only). Never log the image data or the API key.
 */
const DEFAULT_SCAN_MODEL = "gemini-flash-latest";
const ATTEMPTS = 2; // one retry, only for 5xx/429

const PROMPT =
  "Transcribe all Sinhala text in this image exactly as printed, as Unicode. " +
  "Keep paragraph breaks (one blank line between paragraphs). " +
  "Return only the text, with no commentary. If the image has no text, return an empty response.";

/** Trim, unwrap a code fence, and drop a leading "Here is…:" preamble line. */
export function cleanScanText(raw: string): string {
  let t = raw.trim();
  const fence = t.match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
  if (fence) t = fence[1].trim();
  t = t.replace(/^(?:here is|here's|here are|sure)[^\n]*:\s*\n/i, "");
  return t.trim();
}

export async function extractSinhalaText(opts: {
  apiKey: string;
  image: string;
  mimeType: string;
  timeoutMs?: number;
}): Promise<{ text: string; model: string }> {
  const { apiKey, image, mimeType, timeoutMs = 60000 } = opts;
  if (!apiKey) throw new Error("API Key is missing. Please ensure GOOGLE_CLOUD_API_KEY is configured.");
  const model = process.env.GEMINI_SCAN_MODEL || process.env.GEMINI_MODEL || DEFAULT_SCAN_MODEL;
  const body = JSON.stringify({
    contents: [{ parts: [{ inlineData: { mimeType, data: image } }, { text: PROMPT }] }],
    generationConfig: { temperature: 0 },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body,
          signal: ac.signal,
        }
      );
      if (!res.ok) {
        const err = new Error(`Gemini scan error ${res.status}: ${(await res.text()).slice(0, 300)}`);
        if (res.status >= 400 && res.status < 500 && res.status !== 429) throw Object.assign(err, { fatal: true });
        throw err;
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      return { text: cleanScanText(raw), model };
    } catch (err) {
      lastError = err;
      if ((err as { fatal?: boolean }).fatal) break;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
