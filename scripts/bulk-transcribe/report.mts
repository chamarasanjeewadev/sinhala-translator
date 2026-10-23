// Coverage report for a finished batch: per file, how the three passes
// compared, which passages the vote restored, and which spots need checking
// by ear (each with its clip in $OUT/review). Internal, not for the client.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const WORK = process.env.WORK!, OUT = process.env.OUT!;
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t) % 60).padStart(2, "0")}`;
const clip = (base: string, t: number) => `${base}_${mmss(Math.max(0, t - 15)).replace(":", "m")}s.mp3`;

const files = readFileSync(join(WORK, "ids.txt"), "utf8").trim().split("\n").map((l) => l.split(" ").slice(1).join(" "));
const lines = [
  "# Transcription coverage report",
  "",
  "Each file was transcribed in three passes with different chunk boundaries. A phrase missing from the main pass was restored only when both other passes heard it.",
  "",
  "**Check by ear** (each has a 30 s clip in `review/`):",
  "- *single pass*: a phrase only pass B or C heard, left out. Speech the main pass dropped, or invented: add it if you hear it.",
  "- *only A*: a stretch only the main pass heard, kept in. Confirm it was said.",
  "- *dense*: a 2-minute chunk with far more text than usual. Check it for sentences that were never said.",
  "- *repeat*: a phrase written twice in a row. A real repetition, or a sign words were skipped.",
  "",
  "| File | Length | Speech | Words (A/B/C → final) | Restored | Single pass | Only A | Dense | Repeats |",
  "|---|---|---|---|---|---|---|---|---|",
];
const detail: string[] = [];
let toReview = 0;
for (const name of files) {
  const p = join(WORK, "files", name.replace(/\.wav$/i, "").replace(/\s+/g, "_"), "result.json");
  if (!existsSync(p)) { lines.push(`| ${name} | not done | | | | | | | |`); continue; }
  const r = JSON.parse(readFileSync(p, "utf8"));
  const final = r.paragraphs.join(" ").split(" ").length;
  lines.push(`| ${r.base} | ${mmss(r.durationSeconds)} | ${mmss(r.speechSeconds)} | ${r.passWords.join("/")} → ${final} | ${r.restored.length} | ${r.doubtful.length} | ${r.onlyA.length} | ${r.dense.length} | ${r.repeats.length} |`);
  toReview += r.doubtful.length + r.onlyA.length + r.dense.length + r.repeats.length;
  if (r.restored.length + r.doubtful.length + r.onlyA.length + r.dense.length + r.repeats.length === 0) continue;
  detail.push(`## ${r.base}`, "");
  for (const s of r.restored) detail.push(`- **restored** ~${mmss(s.seconds)}: ${s.text}`);
  for (const s of r.doubtful) detail.push(`- **single pass** ~${mmss(s.seconds)} (\`review/${clip(r.base, s.seconds)}\`): ${s.text}`);
  for (const s of r.onlyA) detail.push(`- **only A** ~${mmss(s.seconds)} (\`review/${clip(r.base, s.seconds)}\`): ${s.text}`);
  for (const s of r.dense) detail.push(`- **dense** ~${mmss(s.seconds)} (\`review/${clip(r.base, s.seconds)}\`): ${s.text}…`);
  for (const s of r.repeats) detail.push(`- **repeat** ~${mmss(s.seconds)} (\`review/${clip(r.base, s.seconds)}\`): ${s.text}`);
  detail.push("");
}
lines.push("", `**${toReview} spots to check by ear.**`, "", ...detail);
mkdirSync(join(OUT, "internal"), { recursive: true });
writeFileSync(join(OUT, "internal", "coverage-report.md"), lines.join("\n") + "\n");
console.log(`report written: ${toReview} spots to review`);
