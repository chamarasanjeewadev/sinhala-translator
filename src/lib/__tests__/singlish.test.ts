import { describe, expect, it } from "vitest";
import {
  applySinglishChange,
  backspaceSinglish,
  convertRomanWordBefore,
  singlishToSinhala,
  typeSinglishLetter,
  type SinglishBuffer,
} from "../singlish";

describe("singlishToSinhala", () => {
  it.each([
    ["amma", "අම්ම"],
    ["ammaa", "අම්මා"],
    ["thaaththaa", "තාත්තා"],
    ["mama", "මම"],
    ["oyaa", "ඔයා"],
    ["kohomadha", "කොහොමද"],
    ["laxkaava", "ලංකාව"],
    ["shrii", "ශ්‍රී"],
    ["vidhyaava", "විද්‍යාව"],
    ["ayyaa", "අය්යා"],
    ["sinhala", "සින්හල"],
    ["kAma", "කෑම".replace("ෑ", "ැ")],
    ["kAAma", "කෑම"],
    ["paaTa", "පාඨ"],
    ["iskoolee", "ඉස්කෝලේ"],
    ["zdhuwa", "ඳුව"],
    ["k", "ක්"],
    ["tikak", "ටිකක්"],
    ["daeli", "ඩැලි"],
    ["dhuva", "දුව"],
    ["subha upandhinayak", "සුභ උපන්දිනයක්"],
    ["oyaata kohomadha?", "ඔයාට කොහොමද?"],
    ["shrii laxkaava", "ශ්‍රී ලංකාව"],
    ["123 ok!", "123 ඔක්!"],
  ])("%s → %s", (roman, sinhala) => {
    expect(singlishToSinhala(roman)).toBe(sinhala);
  });
});

describe("live typing", () => {
  const typeWord = (word: string, text = "", caret = text.length) => {
    let buffer: SinglishBuffer | null = null;
    for (const ch of word) {
      const r = typeSinglishLetter(text, caret, caret, ch, buffer);
      ({ text, caret, buffer } = r);
    }
    return { text, caret, buffer };
  };

  it("re-renders the whole word on each letter", () => {
    expect(typeWord("ammaa").text).toBe("අම්මා");
  });

  it("inserts into the middle of existing text", () => {
    const r = typeWord("mama", "X  Y", 2);
    expect(r.text).toBe("X මම Y");
    expect(r.caret).toBe(2 + "මම".length);
  });

  it("backspace removes the last roman letter", () => {
    const r = typeWord("kaa");
    const b = backspaceSinglish(r.text, r.caret, r.caret, r.buffer)!;
    expect(b.text).toBe("ක");
    expect(b.buffer?.roman).toBe("ka");
  });

  it("starts a new word when the caret moved", () => {
    const r = typeWord("ka");
    const r2 = typeSinglishLetter(r.text, 0, 0, "m", r.buffer);
    expect(r2.text).toBe("ම්ක");
  });

  it("backspace outside a live word is not handled", () => {
    expect(backspaceSinglish("abc", 3, 3, null)).toBeNull();
  });
});

describe("convertRomanWordBefore", () => {
  it("converts the trailing roman word", () => {
    expect(convertRomanWordBefore("මම gedhara ", 10)?.text).toBe("මම ගෙදර ");
  });
  it("returns null with nothing to convert", () => {
    expect(convertRomanWordBefore("මම ", 3)).toBeNull();
  });
});

describe("applySinglishChange (React Native onChangeText)", () => {
  const typeKeys = (keys: string[], text = "") => {
    let buffer: SinglishBuffer | null = null;
    let caret = text.length;
    for (const k of keys) {
      const next =
        k === "⌫" ? text.slice(0, caret - 1) + text.slice(caret) : text.slice(0, caret) + k + text.slice(caret);
      const r = applySinglishChange(text, next, buffer);
      text = r.text;
      buffer = r.buffer;
      caret = r.caret ?? (k === "⌫" ? caret - 1 : caret + k.length);
    }
    return text;
  };

  it("converts letter by letter", () => {
    expect(typeKeys([..."mama gedhara yanavaa"])).toBe("මම ගෙදර යනවා");
  });

  it("backspace edits the roman spelling", () => {
    expect(typeKeys([..."kaa", "⌫", "⌫", "i"])).toBe("කි");
  });

  it("converts a committed word on space", () => {
    expect(typeKeys(["gedhara "], "මම ")).toBe("මම ගෙදර ");
  });

  it("passes Sinhala keyboard input through", () => {
    expect(typeKeys(["ම", "ම"])).toBe("මම");
  });
});
