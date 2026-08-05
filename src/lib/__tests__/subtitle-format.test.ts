import { describe, it, expect } from "vitest";
import {
  normalizeSegments,
  offsetSegments,
  mergeChunkSegments,
  formatSrtTime,
  segmentsToSrt,
  segmentsToVtt,
  parseTimecode,
  formatTimecode,
} from "../subtitle-format";
import type { SubtitleSegment } from "../types";

function seg(start: number, end: number, text = "x"): SubtitleSegment {
  return { id: `${start}-${end}`, start, end, text };
}

describe("normalizeSegments", () => {
  it("returns [] for non-array input", () => {
    expect(normalizeSegments(null, 120)).toEqual([]);
    expect(normalizeSegments("nope", 120)).toEqual([]);
    expect(normalizeSegments({}, 120)).toEqual([]);
  });

  it("drops invalid entries and keeps valid ones", () => {
    const raw = [
      { start: 0, end: 2, text: "ok" },
      { start: "bad", end: 2, text: "x" },
      { start: 3, end: 5 },
      { start: 5, end: 6, text: "   " },
      null,
      { start: 6, end: 8, text: "also ok" },
    ];
    const result = normalizeSegments(raw, 120);
    expect(result.map((s) => s.text)).toEqual(["ok", "also ok"]);
    expect(result.every((s) => typeof s.id === "string" && s.id)).toBe(true);
  });

  it("clamps out-of-range times to the chunk duration", () => {
    const result = normalizeSegments([{ start: 118, end: 130, text: "tail" }], 120);
    expect(result).toHaveLength(1);
    expect(result[0].start).toBe(118);
    expect(result[0].end).toBe(120);
  });

  it("drops segments shorter than the minimum duration", () => {
    expect(normalizeSegments([{ start: 1, end: 1.1, text: "blip" }], 120)).toEqual([]);
    expect(normalizeSegments([{ start: 125, end: 130, text: "past end" }], 120)).toEqual([]);
  });

  it("sorts unsorted input and trims overlaps against the next segment", () => {
    const raw = [
      { start: 5, end: 9, text: "b" },
      { start: 0, end: 6, text: "a" },
    ];
    const result = normalizeSegments(raw, 120);
    expect(result.map((s) => s.text)).toEqual(["a", "b"]);
    expect(result[0].end).toBe(5);
    expect(result[1].start).toBe(5);
  });

  it("drops a segment fully swallowed by overlap trimming", () => {
    const raw = [
      { start: 0, end: 10, text: "a" },
      { start: 0.1, end: 10, text: "dup" },
    ];
    // "a" gets trimmed to end=0.1 (< min duration) and dropped; "dup" survives
    const result = normalizeSegments(raw, 120);
    expect(result).toHaveLength(1);
  });
});

describe("offsetSegments", () => {
  it("shifts times by the chunk offset", () => {
    const result = offsetSegments([seg(1, 3), seg(5, 7)], 240);
    expect(result[0].start).toBe(241);
    expect(result[0].end).toBe(243);
    expect(result[1].start).toBe(245);
  });
});

describe("mergeChunkSegments", () => {
  it("concatenates chunks and clamps boundary overlap", () => {
    const chunk0 = [seg(0, 4), seg(115, 121, "spills over")];
    const chunk1 = [seg(120.5, 124, "next chunk")];
    const result = mergeChunkSegments([chunk0, chunk1]);
    expect(result).toHaveLength(3);
    expect(result[2].start).toBe(121); // pushed to prev.end
    expect(result[2].end).toBe(124);
  });

  it("drops segments swallowed at a boundary", () => {
    const result = mergeChunkSegments([[seg(0, 10)], [seg(9.9, 10.1)]]);
    expect(result).toHaveLength(1);
  });

  it("handles empty chunks", () => {
    expect(mergeChunkSegments([[], [seg(1, 2)], []])).toHaveLength(1);
    expect(mergeChunkSegments([])).toEqual([]);
  });
});

describe("formatSrtTime", () => {
  it("formats with comma for SRT and dot for VTT", () => {
    expect(formatSrtTime(3661.24)).toBe("01:01:01,240");
    expect(formatSrtTime(3661.24, ".")).toBe("01:01:01.240");
    expect(formatSrtTime(0)).toBe("00:00:00,000");
    expect(formatSrtTime(-5)).toBe("00:00:00,000");
  });

  it("rounds milliseconds", () => {
    expect(formatSrtTime(1.9996)).toBe("00:00:02,000");
  });
});

describe("segmentsToSrt / segmentsToVtt", () => {
  const segments = [seg(0, 1.5, "හෙලෝ"), seg(2, 4, "line one\nline two")];

  it("produces numbered SRT cues", () => {
    const srt = segmentsToSrt(segments);
    expect(srt).toBe(
      "1\n00:00:00,000 --> 00:00:01,500\nහෙලෝ\n\n" +
        "2\n00:00:02,000 --> 00:00:04,000\nline one\nline two\n"
    );
  });

  it("produces a VTT file with header and dot separators", () => {
    const vtt = segmentsToVtt(segments);
    expect(vtt.startsWith("WEBVTT\n\n")).toBe(true);
    expect(vtt).toContain("00:00:00.000 --> 00:00:01.500");
  });

  it("handles empty tracks", () => {
    expect(segmentsToSrt([])).toBe("");
    expect(segmentsToVtt([])).toBe("WEBVTT\n\n");
  });
});

describe("parseTimecode / formatTimecode", () => {
  it("round-trips", () => {
    expect(parseTimecode(formatTimecode(83.45))).toBe(83.45);
    expect(parseTimecode(formatTimecode(3723.5))).toBe(3723.5);
  });

  it("parses common forms", () => {
    expect(parseTimecode("1:23")).toBe(83);
    expect(parseTimecode("01:23.450")).toBe(83.45);
    expect(parseTimecode("83.45")).toBe(83.45);
    expect(parseTimecode("1:02:03")).toBe(3723);
    expect(parseTimecode("0:90")).toBe(90);
  });

  it("rejects garbage", () => {
    expect(parseTimecode("")).toBeNull();
    expect(parseTimecode("a:b")).toBeNull();
    expect(parseTimecode("-5")).toBeNull();
    expect(parseTimecode("1:2:3:4")).toBeNull();
  });

  it("formats hours only when needed", () => {
    expect(formatTimecode(65.5)).toBe("01:05.500");
    expect(formatTimecode(3665.5)).toBe("1:01:05.500");
  });
});
