export async function transcribeChunk(
  apiKey: string,
  audioBase64: string,
  sampleRateHertz: number,
  timeoutMs: number = 90000 // 90 seconds for 5-minute chunks
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          config: {
            encoding: "LINEAR16",
            sampleRateHertz,
            languageCode: "si-LK",
            enableAutomaticPunctuation: true,
          },
          audio: {
            content: audioBase64,
          },
        }),
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Speech-to-Text API error (${response.status}): ${error}`);
    }

    const data: {
      results?: { alternatives?: { transcript?: string }[] }[];
    } = await response.json();

    if (!data.results || data.results.length === 0) {
      return "";
    }

    return data.results
      .map((result) => result.alternatives?.[0]?.transcript ?? "")
      .join(" ");
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Speech-to-Text timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}
