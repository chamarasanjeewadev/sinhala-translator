// Rebuilds every file's final transcript from the cached chunk results in
// $WORK, without audio or new Gemini calls. Use it after a run was cut short
// (e.g. Drive's download quota) or after changing the merge rules.
//
// A cached chunk that fails the checks (English reply, invented-text density)
// counts as "no data" for its time range. A phrase pass A lacks is restored
// when the third pass also heard it, or when the third pass has no usable
// data there. Writes result.json in the same shape as run.mts, plus TXT.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { keyText, mergeTranscripts, stutters } from "./merge.mts";

const WORK = process.env.WORK!, OUT = process.env.OUT!;
mkdirSync(join(OUT, "txt"), { recursive: true });

interface Chunk { text: string; usage: unknown; start: number; end: number; bad?: string }

const ENGLISH = /[A-Za-z]+(?:[\s,'’:;-]+[A-Za-z]+){2,}/;
function problem(c: Chunk): string | undefined {
  const secs = c.end - c.start;
  if (ENGLISH.test(c.text)) return "English reply";
  if (c.text.length > 25 * secs + 50) return "invented (too dense)";
  return undefined;
}

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t) % 60).padStart(2, "0")}`;

function paragraphs(text: string): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  for (const w of text.split(" ")) {
    cur.push(w);
    if (cur.length >= 120 && /[.?!]$/.test(w)) { out.push(cur.join(" ")); cur = []; }
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}

const files = readFileSync(join(WORK, "ids.txt"), "utf8").trim().split("\n").map((l, idx) => {
  const name = l.split(" ").slice(1).join(" ");
  return { idx, name, base: name.replace(/\.wav$/i, "").replace(/\s+/g, "_") };
});

for (const f of files) {
  const dir = join(WORK, "files", f.base);
  const passes = ["A", "B", "C"].map((tag): Chunk[] => {
    const pd = join(dir, `pass${tag}`);
    if (!existsSync(pd)) return [];
    return readdirSync(pd).filter((n) => /^c\d+\.json$/.test(n)).sort()
      .map((n) => JSON.parse(readFileSync(join(pd, n), "utf8")) as Chunk)
      .map((c) => ({ ...c, bad: problem(c) }));
  });
  if (passes.some((p) => p.length === 0)) { console.log(`skip ${f.name}: passes incomplete`); continue; }
  const duration = Math.max(...passes.flat().map((c) => c.end));
  const good = (p: Chunk[]) => p.filter((c) => !c.bad);
  const [textA, textB, textC] = passes.map((p) => good(p).map((c) => c.text).join(" "));
  const allGood = passes.flatMap(good);

  // Approximate time of a run: the good chunk (any pass) that contains it.
  const timeOf = (run: string): number | null => {
    const needle = ` ${keyText(run).trim().split(" ").slice(0, 4).join(" ")} `;
    for (const c of allGood) {
      const hay = keyText(c.text), at = hay.indexOf(needle);
      if (at >= 0) return c.start + (hay.slice(0, at).split(" ").length / Math.max(1, hay.split(" ").length)) * (c.end - c.start);
    }
    return null;
  };
  const badAt = (p: Chunk[], t: number | null) => t !== null && p.some((c) => c.bad && t >= c.start - 5 && t <= c.end + 5);
  const confirmedBy = (other: string, otherPass: Chunk[]) => (run: string) =>
    keyText(other).includes(keyText(run)) || badAt(otherPass, timeOf(run));

  const ab = mergeTranscripts(textA, textB, confirmedBy(textC, passes[2]), (r) => keyText(textB).includes(keyText(r)) || keyText(textC).includes(keyText(r)));
  const abc = mergeTranscripts(ab.text, textC, confirmedBy(textB, passes[1]));
  const merged = abc.text;
  const spot = (text: string) => ({ text, seconds: Math.round(timeOf(text) ?? 0) });

  const rate = (c: Chunk) => c.text.length / Math.max(1, c.end - c.start);
  const rates = good(passes[0]).map(rate).sort((x, y) => x - y);
  const median = rates[Math.floor(rates.length / 2)];
  const result = {
    idx: f.idx, name: f.name, base: f.base, durationSeconds: duration, speechSeconds: null,
    channels: { used: "cached" }, model: "gemini-3-flash-preview", thinkingLevel: "minimal",
    passWords: [textA, textB, textC].map((t) => t.split(" ").length),
    excludedChunks: passes.flatMap((p, i) => p.filter((c) => c.bad).map((c) => ({ pass: "ABC"[i], start: c.start, end: c.end, reason: c.bad }))),
    restored: [...ab.inserted, ...abc.inserted].map((r) => spot(r.text)),
    doubtful: [...ab.rejected, ...abc.rejected].filter((r) => !keyText(merged).includes(keyText(r.text))).map((r) => spot(r.text)),
    onlyA: ab.unconfirmed.filter((r) => r.text.split(" ").length >= 8).map((r) => spot(r.text)),
    dense: good(passes[0]).filter((c) => c.end - c.start > 30 && rate(c) > 1.7 * median).map((c) => ({ text: c.text.slice(0, 120), seconds: Math.round((c.start + c.end) / 2) })),
    repeats: stutters(merged).map((r) => spot(r.text)),
    paragraphs: paragraphs(merged),
    usages: passes.flatMap((p, i) => p.map((c) => ({ kind: `chunk-${"ABC"[i]}`, usage: c.usage }))),
  };
  writeFileSync(join(dir, "result.json"), JSON.stringify(result, null, 1));
  writeFileSync(join(OUT, "txt", `${f.base}.txt`), result.paragraphs.join("\n\n") + "\n");
  const ex = result.excludedChunks.map((e) => `${e.pass} ${mmss(e.start)}–${mmss(e.end)} ${e.reason}`).join(", ");
  console.log(`${f.base}: ${result.passWords.join("/")} → ${merged.split(" ").length} words; restored ${result.restored.length}; review ${result.doubtful.length}+${result.onlyA.length}+${result.dense.length}+${result.repeats.length}${ex ? `; excluded ${ex}` : ""}`);
}
