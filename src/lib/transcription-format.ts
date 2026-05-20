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
