import type { SubtitleSegment } from "./types";

// Pure subtitle helpers shared by the API routes (normalization/offsetting)
// and the client editor (SRT/VTT export). No "use client" — keep importable
// from both sides.

/** Raw segment shape returned by the Gemini JSON response, before validation */
export interface RawSubtitleSegment {
  start?: unknown;
  end?: unknown;
  text?: unknown;
}

export const MIN_SEGMENT_DURATION_SEC = 0.3;

/**
 * Validate, clamp, sort, and de-overlap raw model output for a single chunk.
 * Times stay chunk-relative; use offsetSegments() to shift to absolute time.
 */
export function normalizeSegments(
  raw: unknown,
  chunkDurationSec: number
): SubtitleSegment[] {
  if (!Array.isArray(raw)) return [];

  const cleaned: { start: number; end: number; text: string }[] = [];
  for (const item of raw as RawSubtitleSegment[]) {
    if (!item || typeof item !== "object") continue;
    const start = Number(item.start);
    const end = Number(item.end);
    const text = typeof item.text === "string" ? item.text.trim() : "";
    if (!text || !Number.isFinite(start) || !Number.isFinite(end)) continue;

    const clampedStart = Math.max(0, Math.min(start, chunkDurationSec));
    const clampedEnd = Math.max(0, Math.min(end, chunkDurationSec));
    if (clampedEnd - clampedStart < MIN_SEGMENT_DURATION_SEC) continue;

    cleaned.push({ start: clampedStart, end: clampedEnd, text });
  }

  cleaned.sort((a, b) => a.start - b.start);

  // Trim overlaps against the following segment; drop what collapses.
  const result: SubtitleSegment[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const seg = { ...cleaned[i] };
    const next = cleaned[i + 1];
    if (next && seg.end > next.start) {
      seg.end = next.start;
    }
    if (seg.end - seg.start < MIN_SEGMENT_DURATION_SEC) continue;
    result.push({
      id: crypto.randomUUID(),
      start: roundTime(seg.start),
      end: roundTime(seg.end),
      text: seg.text,
    });
  }
  return result;
}

/** Shift all segment times by a chunk's offset within the full video */
export function offsetSegments(
  segments: SubtitleSegment[],
  offsetSec: number
): SubtitleSegment[] {
  return segments.map((s) => ({
    ...s,
    start: roundTime(s.start + offsetSec),
    end: roundTime(s.end + offsetSec),
  }));
}

/**
 * Merge per-chunk segment arrays (already absolute-time) into one track,
 * clamping any overlap across chunk boundaries.
 */
export function mergeChunkSegments(
  chunks: SubtitleSegment[][]
): SubtitleSegment[] {
  const all = chunks.flat().sort((a, b) => a.start - b.start);
  const result: SubtitleSegment[] = [];
  for (const seg of all) {
    const prev = result[result.length - 1];
    const adjusted = { ...seg };
    if (prev && adjusted.start < prev.end) {
      adjusted.start = prev.end;
    }
    if (adjusted.end - adjusted.start < MIN_SEGMENT_DURATION_SEC) continue;
    result.push(adjusted);
  }
  return result;
}

function roundTime(sec: number): number {
  return Math.round(sec * 1000) / 1000;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** 3661.24 → "01:01:01,240" (SRT) or "01:01:01.240" (VTT) */
export function formatSrtTime(sec: number, separator: "," | "." = ","): string {
  const clamped = Math.max(0, sec);
  const totalMs = Math.round(clamped * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}${separator}${pad(ms, 3)}`;
}

export function segmentsToSrt(segments: SubtitleSegment[]): string {
  return segments
    .map(
      (seg, i) =>
        `${i + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.text}\n`
    )
    .join("\n");
}

export function segmentsToVtt(segments: SubtitleSegment[]): string {
  const cues = segments
    .map(
      (seg) =>
        `${formatSrtTime(seg.start, ".")} --> ${formatSrtTime(seg.end, ".")}\n${seg.text}\n`
    )
    .join("\n");
  return `WEBVTT\n\n${cues}`;
}

/** "01:23.450" | "1:23" | "83.45" → seconds, or null if unparseable */
export function parseTimecode(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length > 3) return null;
  let seconds = 0;
  for (const part of parts) {
    const value = Number(part.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return null;
    seconds = seconds * 60 + value;
  }
  return roundTime(seconds);
}

/** Seconds → "mm:ss.mmm" (or "h:mm:ss.mmm" past one hour) for timecode inputs */
export function formatTimecode(sec: number): string {
  const clamped = Math.max(0, sec);
  const totalMs = Math.round(clamped * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  const base = `${pad(m, 2)}:${pad(s, 2)}.${pad(ms, 3)}`;
  return h > 0 ? `${h}:${base}` : base;
}
