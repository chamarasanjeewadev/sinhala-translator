const TIMESTAMP_RANGE_PREFIX =
  /^\s*(?:\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d{1,3})?\s*(?:-|–|—|-->|->|to)\s*(?:\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d{1,3})?\s*:?\s*/;
const TIMESTAMP_SINGLE_PREFIX =
  /^\s*(?:\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d{1,3})?\s*[:\-]\s*/;

function stripWrappingQuotes(line: string): string {
  if (
    (line.startsWith('"') && line.endsWith('"')) ||
    (line.startsWith("“") && line.endsWith("”"))
  ) {
    return line.slice(1, -1).trim();
  }
  return line;
}

export function normalizeTranscriptionText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(TIMESTAMP_RANGE_PREFIX, ""))
    .map((line) => line.replace(TIMESTAMP_SINGLE_PREFIX, ""))
    .map((line) => stripWrappingQuotes(line))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// Used when conversation mode or timestamps are enabled: cleans up lines but
// preserves the line structure, [mm:ss] markers and "Speaker N:" labels.
export function normalizeStructuredTranscription(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => stripWrappingQuotes(line))
    .filter(Boolean)
    .join("\n")
    .trim();
}

const BRACKET_TIMESTAMP = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;

function formatTimestamp(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `[${h}:${pad(m)}:${pad(s)}]` : `[${m}:${pad(s)}]`;
}

// Rewrites chunk-relative [mm:ss] (or [h:mm:ss]) markers to absolute time by
// adding the chunk's offset within the full recording.
export function offsetTimestamps(text: string, offsetSec: number): string {
  return text.replace(BRACKET_TIMESTAMP, (_match, a, b, c) => {
    const relativeSec = c
      ? Number(a) * 3600 + Number(b) * 60 + Number(c)
      : Number(a) * 60 + Number(b);
    return formatTimestamp(relativeSec + offsetSec);
  });
}
