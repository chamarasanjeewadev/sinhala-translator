import { describe, expect, it } from "vitest";
import { isScanMime, scanCharge, trimForTts } from "../scan-to-text";

describe("scanCharge", () => {
  it("makes the first SCAN_FREE_PAGES pages free", () => {
    expect(scanCharge(0)).toEqual({ free: 1, credits: 0 });
    expect(scanCharge(2)).toEqual({ free: 1, credits: 0 });
  });

  it("charges one credit per page once the free pages are used", () => {
    expect(scanCharge(3)).toEqual({ free: 0, credits: 1 });
    expect(scanCharge(99)).toEqual({ free: 0, credits: 1 });
  });
});

describe("isScanMime", () => {
  it("accepts only the supported image types", () => {
    expect(isScanMime("image/jpeg")).toBe(true);
    expect(isScanMime("image/png")).toBe(true);
    expect(isScanMime("image/webp")).toBe(true);
    expect(isScanMime("application/pdf")).toBe(false);
    expect(isScanMime(undefined)).toBe(false);
  });
});

describe("trimForTts", () => {
  it("returns short text untouched", () => {
    expect(trimForTts("a".repeat(10), 1400)).toEqual({ text: "a".repeat(10), truncated: false });
  });

  it("cuts at the last sentence end within max and keeps the punctuation", () => {
    const text = "x".repeat(1300) + "." + "y".repeat(700);
    const out = trimForTts(text, 1400);
    expect(out.truncated).toBe(true);
    expect(out.text).toBe("x".repeat(1300) + ".");
  });

  it("prefers a paragraph break over a sentence end", () => {
    const text = "x".repeat(500) + ".\n\n" + "y".repeat(500) + ". " + "z".repeat(2000);
    const out = trimForTts(text, 1400);
    expect(out.truncated).toBe(true);
    expect(out.text).toBe("x".repeat(500) + ".");
  });

  it("supports the Sinhala danda as a sentence end", () => {
    const text = "අ".repeat(300) + "।" + "ආ".repeat(2000);
    const out = trimForTts(text, 400);
    expect(out.text).toBe("අ".repeat(300) + "।");
  });

  it("hard-cuts at max when there is no break", () => {
    const out = trimForTts("a".repeat(2000), 1400);
    expect(out.truncated).toBe(true);
    expect(out.text).toBe("a".repeat(1400));
  });
});
