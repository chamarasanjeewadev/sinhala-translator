// Sinhala Unicode → readable Singlish (roman letters), the reverse of
// singlish.ts. Optimised for reading ("ලංකාව" → "lankaava"), so it uses the
// same spellings people type in chats rather than a strict round-trip.

const HAL = "්";
const ZWJ = "‍";

const CONSONANTS: Record<string, string> = {
  ක: "k", ඛ: "kh", ග: "g", ඝ: "gh", ඞ: "ng", ඟ: "ng",
  ච: "ch", ඡ: "Ch", ජ: "j", ඣ: "jh", ඤ: "ny", ඥ: "gn", ඦ: "nj",
  ට: "t", ඨ: "T", ඩ: "d", ඪ: "D", ණ: "N", ඬ: "nd",
  ත: "th", ථ: "Th", ද: "dh", ධ: "Dh", න: "n", ඳ: "ndh",
  ප: "p", ඵ: "ph", බ: "b", භ: "bh", ම: "m", ඹ: "mb",
  ය: "y", ර: "r", ල: "l", ව: "v", ශ: "sh", ෂ: "Sh", ස: "s", හ: "h",
  ළ: "L", ෆ: "f",
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  අ: "a", ආ: "aa", ඇ: "ae", ඈ: "aae", ඉ: "i", ඊ: "ii", උ: "u", ඌ: "uu",
  ඍ: "ru", ඎ: "ruu", එ: "e", ඒ: "ee", ඓ: "ai", ඔ: "o", ඕ: "oo", ඖ: "au",
};

const VOWEL_SIGNS: Record<string, string> = {
  "ා": "aa", "ැ": "ae", "ෑ": "aae", "ි": "i", "ී": "ii", "ු": "u", "ූ": "uu",
  "ෘ": "ru", "ෲ": "ruu", "ෙ": "e", "ේ": "ee", "ෛ": "ai", "ො": "o", "ෝ": "oo",
  "ෞ": "au", "ෟ": "lu",
};

const OTHER: Record<string, string> = { "ං": "n", "ඃ": "h" };

export function sinhalaToSinglish(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const consonant = CONSONANTS[ch];
    if (consonant !== undefined) {
      out += consonant;
      i += 1;
      const next = text[i];
      if (next === HAL) {
        i += 1;
        if (text[i] === ZWJ) i += 1; // rakaransaya / yansaya: the joiner adds nothing
      } else if (next !== undefined && VOWEL_SIGNS[next] !== undefined) {
        out += VOWEL_SIGNS[next];
        i += 1;
      } else {
        out += "a";
      }
      continue;
    }
    if (ch === ZWJ) {
      i += 1;
      continue;
    }
    out += INDEPENDENT_VOWELS[ch] ?? OTHER[ch] ?? VOWEL_SIGNS[ch] ?? ch;
    i += 1;
  }
  return out;
}
