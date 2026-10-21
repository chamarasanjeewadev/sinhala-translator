// Singlish → Sinhala Unicode transliteration (Helakuru-style phonetic typing).
//
// Pure, dependency-free and platform-agnostic: the web editor and the mobile
// app (hela-voice-app/lib/singlish.ts is a copy of this file) both use it.
// Keep the two copies in sync.
//
// Scheme (natural "chat" Singlish):
//   vowels   a අ  aa ආ  A/ae ඇ  AA/Aa/aae ඈ  i ඉ  ii/I ඉ  u උ  uu/U ඌ
//            e එ  ee/E ඒ  ai ඓ  o ඔ  oo/O ඕ  au ඖ  ru ඍ (rU ඎ)
//   t ට  T ඨ  th ත  Th ථ   d ඩ  D ඪ  dh ද  Dh ධ
//   k ක  K/kh ඛ  g ග  G/gh ඝ  ch/c ච  Ch ඡ  j ජ  J/jh ඣ
//   n න  N ණ  gn/kn ඥ  p ප  P/ph ඵ  b බ  B/bh භ  m ම
//   y ය  r ර  l ල  L ළ  w/v ව  s ස  sh ශ  Sh ෂ  h හ  f ෆ
//   prenasal: zg ඟ  zj ඦ  zd ඬ  zdh ඳ  zb ඹ   anusvara x ං   visarga H ඃ
//   A consonant without a vowel gets a hal (k → ක්); "a" removes it (ka → ක).
//   Consonant + r / y forms rakaransaya / yansaya (kra → ක්‍ර, vidyaava → විද්‍යාව).

const HAL = "්";
const ZWJ = "‍";

type Pair = [string, string];

// [roman, independent vowel, vowel sign]
const VOWELS: [string, string, string][] = [
  ["aae", "ඈ", "ෑ"],
  ["AA", "ඈ", "ෑ"],
  ["Aa", "ඈ", "ෑ"],
  ["aa", "ආ", "ා"],
  ["ae", "ඇ", "ැ"],
  ["ai", "ඓ", "ෛ"],
  ["au", "ඖ", "ෞ"],
  ["A", "ඇ", "ැ"],
  ["a", "අ", ""],
  ["ii", "ඊ", "ී"],
  ["I", "ඊ", "ී"],
  ["i", "ඉ", "ි"],
  ["uu", "ඌ", "ූ"],
  ["U", "ඌ", "ූ"],
  ["u", "උ", "ු"],
  ["ee", "ඒ", "ේ"],
  ["E", "ඒ", "ේ"],
  ["e", "එ", "ෙ"],
  ["oo", "ඕ", "ෝ"],
  ["O", "ඕ", "ෝ"],
  ["o", "ඔ", "ො"],
];

// Vowels that may stand alone only — "ru" as a vowel would swallow ර + u.
const INDEPENDENT_ONLY: Pair[] = [
  ["rU", "ඎ"],
  ["ru", "ඍ"],
];

const CONSONANTS: Pair[] = [
  ["zdh", "ඳ"],
  ["zg", "ඟ"],
  ["zj", "ඦ"],
  ["zd", "ඬ"],
  ["zb", "ඹ"],
  ["kh", "ඛ"],
  ["gh", "ඝ"],
  ["gn", "ඥ"],
  ["kn", "ඥ"],
  ["ch", "ච"],
  ["Ch", "ඡ"],
  ["jh", "ඣ"],
  ["th", "ත"],
  ["Th", "ථ"],
  ["dh", "ද"],
  ["Dh", "ධ"],
  ["ph", "ඵ"],
  ["bh", "භ"],
  ["sh", "ශ"],
  ["Sh", "ෂ"],
  ["k", "ක"],
  ["K", "ඛ"],
  ["g", "ග"],
  ["G", "ඝ"],
  ["c", "ච"],
  ["C", "ඡ"],
  ["j", "ජ"],
  ["J", "ඣ"],
  ["t", "ට"],
  ["T", "ඨ"],
  ["d", "ඩ"],
  ["D", "ඪ"],
  ["n", "න"],
  ["N", "ණ"],
  ["p", "ප"],
  ["P", "ඵ"],
  ["b", "බ"],
  ["B", "භ"],
  ["m", "ම"],
  ["M", "ම"],
  ["y", "ය"],
  ["Y", "ය"],
  ["r", "ර"],
  ["R", "ර"],
  ["l", "ල"],
  ["L", "ළ"],
  ["w", "ව"],
  ["W", "ව"],
  ["v", "ව"],
  ["V", "ව"],
  ["s", "ස"],
  ["S", "ෂ"],
  ["h", "හ"],
  ["f", "ෆ"],
  ["F", "ෆ"],
  ["q", "ක"],
  ["Q", "ක"],
  ["z", "ස"],
  ["Z", "ස"],
];

const SPECIALS: Pair[] = [
  ["x", "ං"],
  ["X", "ඞ"],
  ["H", "ඃ"],
];

function matchAt<T extends readonly string[]>(
  input: string,
  i: number,
  table: T[]
): T | null {
  for (const row of table) {
    if (input.startsWith(row[0], i)) return row;
  }
  return null;
}

/** Transliterate a run of Singlish into Sinhala Unicode. Non-letters pass through. */
export function singlishToSinhala(input: string): string {
  let out = "";
  let i = 0;

  while (i < input.length) {
    const special = matchAt(input, i, SPECIALS);
    if (special) {
      out += special[1];
      i += special[0].length;
      continue;
    }

    const consonant = matchAt(input, i, CONSONANTS);
    if (consonant) {
      out += consonant[1];
      i += consonant[0].length;
      // A consonant may be followed by r/y (rakaransaya / yansaya), then a vowel.
      let base = consonant[1];
      for (;;) {
        const vowel = matchAt(input, i, VOWELS);
        if (vowel) {
          out += vowel[2];
          i += vowel[0].length;
          break;
        }
        const next = input[i];
        const joiner =
          (next === "r" && base !== "ර" && "ර") ||
          (next === "y" && base !== "ය" && "ය") ||
          null;
        if (joiner) {
          out += HAL + ZWJ + joiner;
          base = joiner;
          i += 1;
          continue;
        }
        out += HAL;
        break;
      }
      continue;
    }

    const independent =
      matchAt(input, i, INDEPENDENT_ONLY) ??
      (() => {
        const v = matchAt(input, i, VOWELS);
        return v ? ([v[0], v[1]] as Pair) : null;
      })();
    if (independent) {
      out += independent[1];
      i += independent[0].length;
      continue;
    }

    out += input[i];
    i += 1;
  }

  return out;
}

const ROMAN_LETTER = /^[A-Za-z]$/;

export function isRomanLetter(ch: string): boolean {
  return ROMAN_LETTER.test(ch);
}

/**
 * State for live, as-you-type conversion. While the user types letters, the
 * roman buffer for the current word is kept and its Sinhala rendering replaces
 * text[start, start + rendered.length). Any other edit ends the word.
 */
export interface SinglishBuffer {
  start: number;
  roman: string;
  rendered: string;
}

export interface SinglishEdit {
  text: string;
  caret: number;
  buffer: SinglishBuffer | null;
}

function bufferIsLive(
  buffer: SinglishBuffer | null,
  text: string,
  selStart: number,
  selEnd: number
): buffer is SinglishBuffer {
  return (
    !!buffer &&
    selStart === selEnd &&
    selStart === buffer.start + buffer.rendered.length &&
    text.slice(buffer.start, selStart) === buffer.rendered
  );
}

/** Apply one typed roman letter at the caret (replacing any selection). */
export function typeSinglishLetter(
  text: string,
  selStart: number,
  selEnd: number,
  letter: string,
  buffer: SinglishBuffer | null
): SinglishEdit {
  const live = bufferIsLive(buffer, text, selStart, selEnd);
  const start = live ? buffer.start : selStart;
  const tailFrom = live ? selStart : selEnd;
  const roman = (live ? buffer.roman : "") + letter;
  const rendered = singlishToSinhala(roman);
  const next = text.slice(0, start) + rendered + text.slice(tailFrom);
  return {
    text: next,
    caret: start + rendered.length,
    buffer: { start, roman, rendered },
  };
}

/** Backspace inside a live word removes the last roman letter. Null = not handled. */
export function backspaceSinglish(
  text: string,
  selStart: number,
  selEnd: number,
  buffer: SinglishBuffer | null
): SinglishEdit | null {
  if (!bufferIsLive(buffer, text, selStart, selEnd)) return null;
  const roman = buffer.roman.slice(0, -1);
  const rendered = singlishToSinhala(roman);
  const next = text.slice(0, buffer.start) + rendered + text.slice(selStart);
  return {
    text: next,
    caret: buffer.start + rendered.length,
    buffer: roman ? { start: buffer.start, roman, rendered } : null,
  };
}

/**
 * Fallback for keyboards that compose words (Android): convert the run of roman
 * letters that ends at `end`. Returns null when there is nothing to convert.
 */
export function convertRomanWordBefore(
  text: string,
  end: number
): { text: string; caret: number } | null {
  let start = end;
  while (start > 0 && isRomanLetter(text[start - 1])) start--;
  if (start === end) return null;
  const rendered = singlishToSinhala(text.slice(start, end));
  return {
    text: text.slice(0, start) + rendered + text.slice(end),
    caret: start + rendered.length,
  };
}

/** Split an edit into the replaced range of `prev` and the inserted text. */
function diffText(prev: string, next: string) {
  let p = 0;
  const max = Math.min(prev.length, next.length);
  while (p < max && prev[p] === next[p]) p++;
  let q = 0;
  while (q < max - p && prev[prev.length - 1 - q] === next[next.length - 1 - q]) q++;
  return { start: p, removedEnd: prev.length - q, inserted: next.slice(p, next.length - q) };
}

/**
 * For inputs that only report the new text (React Native's onChangeText):
 * turn a raw edit into its Singlish result. `caret` is null when the edit is
 * passed through unchanged.
 */
export function applySinglishChange(
  prev: string,
  next: string,
  buffer: SinglishBuffer | null
): { text: string; caret: number | null; buffer: SinglishBuffer | null } {
  const { start, removedEnd, inserted } = diffText(prev, next);

  if (inserted.length === 1 && isRomanLetter(inserted)) {
    return typeSinglishLetter(prev, start, removedEnd, inserted, buffer);
  }

  if (inserted === "" && removedEnd > start) {
    // Backspace may remove a whole grapheme; treat it as one roman letter.
    const r = backspaceSinglish(prev, removedEnd, removedEnd, buffer);
    if (r) return r;
  }

  const trailing = inserted.length - inserted.replace(/[^A-Za-z]+$/, "").length;
  if (trailing > 0) {
    const r = convertRomanWordBefore(next, start + inserted.length - trailing);
    if (r) return { text: r.text, caret: r.caret + trailing, buffer: null };
  }
  return { text: next, caret: null, buffer: null };
}
