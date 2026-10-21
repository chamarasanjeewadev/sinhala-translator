import { describe, expect, it } from "vitest";
import { unicodeToFmAbhaya } from "../sinhala-legacy";
import { sinhalaToSinglish } from "../sinhala-to-singlish";
import { singlishToSinhala } from "../singlish";

describe("unicodeToFmAbhaya", () => {
  it.each([
    ["අම්මා", "wïud"],
    ["ක", "l"],
    ["කෙ", "fl"],
    ["ලංකාව", ",xldj"],
    ["ගෙදර", "f.or"],
  ])("%s → %s", (uni, fm) => {
    expect(unicodeToFmAbhaya(uni)).toBe(fm);
  });

  it("leaves latin text and digits alone", () => {
    expect(unicodeToFmAbhaya("ABC 123")).toBe("ABC 123");
  });
});

describe("sinhalaToSinglish", () => {
  it.each([
    ["මම ගෙදර යනවා", "mama gedhara yanavaa"],
    ["ලංකාව", "lankaava"],
    ["ශ්‍රී", "shrii"],
    ["අම්මා", "ammaa"],
    ["කොහොමද?", "kohomadha?"],
  ])("%s → %s", (si, roman) => {
    expect(sinhalaToSinglish(si)).toBe(roman);
  });

  it("round-trips everyday words", () => {
    for (const w of ["mama gedhara yanavaa", "ammaa", "kohomadha", "shrii"]) {
      expect(sinhalaToSinglish(singlishToSinhala(w))).toBe(w);
    }
  });
});
