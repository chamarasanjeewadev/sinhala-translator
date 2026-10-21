// Sinhala Unicode → legacy font encodings, for designers who still use
// FM Abhaya / FM Malithi in Photoshop, Illustrator or old Word templates.
//
// The syllable table (src/lib/data/fm-abhaya-map.json) comes from
// github.com/kawishkamd/sinhala-legacy-converter (MIT, © 2025 Kavishka Dahanayaka).
// Conversion is a longest-match lookup, so kombuva / rakaransaya / yansaya
// combinations map to the right glyph order.

import FM_MAP from "./data/fm-abhaya-map.json";

const MAP = FM_MAP as Record<string, string>;
const MAX_KEY = Math.max(...Object.keys(MAP).map((k) => k.length));

/** Convert Sinhala Unicode to FM Abhaya (also works for other FM fonts). */
export function unicodeToFmAbhaya(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (let len = Math.min(MAX_KEY, text.length - i); len > 0; len--) {
      const hit = MAP[text.slice(i, i + len)];
      if (hit !== undefined) {
        out += hit;
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += text[i];
      i += 1;
    }
  }
  return out;
}
