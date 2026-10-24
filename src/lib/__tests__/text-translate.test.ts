import { describe, expect, it } from "vitest";
import {
  ANON_TEXT_LIMIT,
  SIGNED_IN_TEXT_LIMIT,
  parseTranslateTextBody,
  textLimitFor,
} from "../text-translate";

describe("textLimitFor", () => {
  it("gives signed-in users a higher cap", () => {
    expect(textLimitFor(false)).toBe(ANON_TEXT_LIMIT);
    expect(textLimitFor(true)).toBe(SIGNED_IN_TEXT_LIMIT);
  });
});

describe("parseTranslateTextBody", () => {
  it("accepts both directions and trims the text", () => {
    expect(parseTranslateTextBody({ text: "  hello ", direction: "en-si" }, 500)).toEqual({
      ok: true,
      text: "hello",
      direction: "en-si",
    });
    expect(parseTranslateTextBody({ text: "ආයුබෝවන්", direction: "si-en" }, 500).ok).toBe(true);
  });

  it("rejects unknown directions", () => {
    expect(parseTranslateTextBody({ text: "hi", direction: "en-ta" }, 500)).toEqual({
      ok: false,
      error: "bad_direction",
    });
  });

  it("rejects missing or blank text", () => {
    expect(parseTranslateTextBody({ direction: "en-si" }, 500)).toEqual({ ok: false, error: "missing_text" });
    expect(parseTranslateTextBody({ text: "   ", direction: "en-si" }, 500)).toEqual({
      ok: false,
      error: "missing_text",
    });
    expect(parseTranslateTextBody(null, 500)).toEqual({ ok: false, error: "bad_direction" });
  });

  it("enforces the limit on the trimmed length", () => {
    expect(parseTranslateTextBody({ text: "a".repeat(10), direction: "en-si" }, 10).ok).toBe(true);
    expect(parseTranslateTextBody({ text: ` ${"a".repeat(10)} `, direction: "en-si" }, 10).ok).toBe(true);
    expect(parseTranslateTextBody({ text: "a".repeat(11), direction: "en-si" }, 10)).toEqual({
      ok: false,
      error: "too_long",
    });
  });
});
