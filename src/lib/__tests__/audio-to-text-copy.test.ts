import { describe, expect, it } from "vitest";
import en from "../i18n/dictionaries/en.json";
import si from "../i18n/dictionaries/si.json";

// Values the /sinhala-audio-to-text page fills in at render time (page.tsx `vars` + `freeNote`).
const FILLED = new Set([
  "maxMb", "chunkMin", "exampleMinutes", "exampleCredits", "starterPrice", "starterCredits",
  "freeCredits", "freeMinutes", "freeNote",
]);

// Same key shape, array lengths included.
function shape(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shape);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)]));
  return typeof v;
}

function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}

describe("audioToText copy", () => {
  it("has the same key shape in en and si", () => {
    expect(shape(si.audioToText)).toEqual(shape(en.audioToText));
    expect(Object.keys(si.relatedTools.items)).toEqual(Object.keys(en.relatedTools.items));
  });

  it("uses only placeholders the page fills in", () => {
    for (const dict of [en, si]) {
      for (const s of strings(dict.audioToText)) {
        for (const [, name] of s.matchAll(/\{(\w+)\}/g)) expect(FILLED.has(name), `{${name}} in "${s}"`).toBe(true);
      }
    }
  });

  it("keeps the brand out of the page title (the [locale] layout appends it)", () => {
    expect(en.audioToText.metaTitle).not.toMatch(/HelaVoice/i);
    expect(si.audioToText.metaTitle).not.toMatch(/HelaVoice/i);
  });

  it("keeps 'audio to text' off the homepage title, description and subtitle", () => {
    const home = [en.metadata.title, en.metadata.description, en.landing.heroSubtitle].join(" ");
    expect(home).not.toMatch(/audio to text/i);
  });
});
