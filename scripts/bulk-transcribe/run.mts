// Bulk Sinhala transcription of a public Google Drive folder, for manual/B2B
// jobs. Uses the web app's own Gemini prompt (transcribeWithGemini) and
// normalizeTranscriptionText, but adds what a long unattended job needs to
// avoid missing speech:
//   1. channel choice from the whole file (silent / duplicate / different
//      speech per channel), so no voice on the other channel is dropped;
//   2. chunks cut at pauses near every 120 s, so no word is split;
//   3. three passes with different chunk boundaries, merged word by word
//      (merge.mts). A phrase missing from pass A is restored when both other
//      passes heard it; single passes both drop and invent short phrases.
//      Phrases only one pass heard, back-to-back repeats and unusually dense
//      chunks (possible invented text) are listed in a review report with an
//      audio clip each, to check by ear;
//   4. output validation: chatty English replies or empty chunks are retried.
// Resumable: everything is cached under $WORK. See README.md.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, renameSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenerativeAI, type UsageMetadata } from "@google/generative-ai";
import { transcribeWithGemini } from "../../src/lib/gemini-transcribe.ts";
import { normalizeTranscriptionText } from "../../src/lib/transcription-format.ts";
import { keyText, mergeTranscripts, stutters, type Run } from "./merge.mts";

// Match the live admin setting (app_settings gemini_model / thinking_level).
const MODEL = process.env.MODEL || "gemini-3-flash-preview";
const THINKING = process.env.THINKING || "minimal";
const API_KEY = process.env.GOOGLE_CLOUD_API_KEY!, WORK = process.env.WORK!, OUT = process.env.OUT!;
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const CONC = 3;
const SR = 16000;
const CHUNK_S = 120;
const PASSES: [string, number][] = [["A", 120], ["B", 60], ["C", 30]];

type Usage = { promptTokens: number; outputTokens: number; thoughtsTokens: number; totalTokens: number };

const files = readFileSync(join(WORK, "ids.txt"), "utf8").trim().split("\n").map((l, idx) => {
  const [id, ...rest] = l.split(" ");
  const name = rest.join(" ");
  return { idx, id, name, base: name.replace(/\.wav$/i, "").replace(/\s+/g, "_") };
});
mkdirSync(join(OUT, "txt"), { recursive: true });

async function retry<T>(fn: () => Promise<T>, label: string, attempts = 8): Promise<T> {
  for (let a = 0; ; a++) {
    try { return await fn(); } catch (e) {
      if (a >= attempts - 1) throw e;
      console.error(`  retry ${label} #${a + 1}: ${(e as Error).message.slice(0, 140)}`);
      await new Promise((r) => setTimeout(r, 3000 * (a + 1)));
    }
  }
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

// ── PCM helpers (16 kHz mono s16le) ──

function readPcm(path: string): Int16Array {
  const b = readFileSync(path);
  return new Int16Array(b.buffer, b.byteOffset, b.length >> 1);
}

function wav(pcm: Int16Array): Buffer {
  const data = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

/** RMS level in dB for each `win`-sample window. */
function levels(pcm: Int16Array, win: number, other?: Int16Array): number[] {
  const out: number[] = [];
  for (let s = 0; s + win <= pcm.length; s += win) {
    let sum = 0;
    for (let i = s; i < s + win; i += 4) {
      const v = other ? pcm[i] - other[i] : pcm[i];
      sum += v * v;
    }
    out.push(20 * Math.log10(Math.max(Math.sqrt(sum / (win / 4)), 1e-9) / 32768));
  }
  return out;
}

const SPEECH_DB = -45;

/** Compare channels second by second: which carry speech, and do they differ? */
function channelStats(L: Int16Array, R: Int16Array) {
  const n = Math.min(L.length, R.length);
  const l = levels(L.subarray(0, n), SR), r = levels(R.subarray(0, n), SR), d = levels(L.subarray(0, n), SR, R.subarray(0, n));
  let speechL = 0, speechR = 0, both = 0, different = 0;
  for (let i = 0; i < l.length; i++) {
    const sl = l[i] > SPEECH_DB, sr = r[i] > SPEECH_DB;
    if (sl) speechL++;
    if (sr) speechR++;
    if (sl && sr) { both++; if (d[i] > Math.max(l[i], r[i]) - 6) different++; }
  }
  return { speechL, speechR, both, different, seconds: l.length };
}

async function detectLang(pcm: Int16Array): Promise<{ lang: string; usage: Usage | null }> {
  const model = new GoogleGenerativeAI(API_KEY).getGenerativeModel({ model: MODEL, generationConfig: { temperature: 0, thinkingConfig: { thinkingLevel: THINKING } } as never });
  const r = await model.generateContent([
    { inlineData: { mimeType: "audio/wav", data: wav(pcm).toString("base64") } },
    "What language is spoken in this audio? Reply with exactly one word: SINHALA, ENGLISH, OTHER or SILENT.",
  ]);
  // thoughtsTokenCount is returned by the API but missing from the legacy SDK type.
  const m = r.response.usageMetadata as (UsageMetadata & { thoughtsTokenCount?: number }) | undefined;
  return { lang: r.response.text().trim().toUpperCase(), usage: m ? { promptTokens: m.promptTokenCount ?? 0, outputTokens: m.candidatesTokenCount ?? 0, thoughtsTokens: m.thoughtsTokenCount ?? 0, totalTokens: m.totalTokenCount ?? 0 } : null };
}

/** Language at 3 points (25/50/75%), majority vote, ignoring silent samples. */
async function channelLanguage(pcm: Int16Array, usages: { kind: string; usage: Usage | null }[], label: string): Promise<string> {
  const votes: string[] = [];
  for (const f of [0.25, 0.5, 0.75]) {
    const s = Math.floor((pcm.length * f) / SR) * SR;
    const d = await retry(() => detectLang(pcm.subarray(s, s + 20 * SR)), `lang ${label}`);
    usages.push({ kind: `langcheck-${label}`, usage: d.usage });
    if (!d.lang.includes("SILENT")) votes.push(d.lang.includes("SINHALA") ? "SINHALA" : d.lang.includes("ENGLISH") ? "ENGLISH" : "OTHER");
  }
  if (!votes.length) return "SILENT";
  return votes.filter((v) => v === "SINHALA").length * 2 >= votes.length ? "SINHALA" : votes[0];
}

/**
 * Cut points near each target time, placed in the quietest stretch within
 * ±6 s so no word is split. The window stays narrow on purpose: wider, and
 * all passes snap to the same long pause, so the same stretch opens a chunk
 * in every pass, and the model tends to miss a clip's first words.
 */
function cutPoints(pcm: Int16Array, firstTarget: number): number[] {
  const win = SR / 10; // 0.1 s
  const lv = levels(pcm, win);
  const total = pcm.length / SR;
  const cuts: number[] = [];
  for (let t = firstTarget; t < total - 15; t += CHUNK_S) {
    const lo = Math.max(1, Math.floor((t - 6) * 10)), hi = Math.min(lv.length - 1, Math.floor((t + 6) * 10));
    // Longest run of windows under -40 dB; fall back to the single quietest window.
    let best = -1, bestLen = 0, runStart = -1, quietest = lo;
    for (let i = lo; i <= hi; i++) {
      if (lv[i] < lv[quietest]) quietest = i;
      if (lv[i] < -40) {
        if (runStart < 0) runStart = i;
        if (i - runStart + 1 > bestLen) { bestLen = i - runStart + 1; best = runStart; }
      } else runStart = -1;
    }
    cuts.push(bestLen > 0 ? (best + bestLen / 2) / 10 : quietest / 10);
  }
  return cuts;
}

// The app's fallback (no thinkingConfig) sometimes answers in English instead
// of transcribing ("Sure, here's the transcription…", "Please provide the
// audio file…"). Three English words in a row is treated as such a reply.
const CHATTY = /[A-Za-z]+(?:[\s,'’:;-]+[A-Za-z]+){2,}/;
// Three or more Latin-script words in a row, up to the next sentence end.
const LATIN_SENTENCE = /[A-Za-z][A-Za-z'’]*(?:[\s,:;()-]+[A-Za-z][A-Za-z'’]*){2,}[^඀-෿]*?(?:[.!?:]|$)/g;

async function transcribeChunk(pcm: Int16Array, label: string): Promise<{ text: string; usage: Usage | null }> {
  let chattyReplies = 0;
  return retry(async () => {
    const r = await transcribeWithGemini({
      apiKey: API_KEY, audioBase64: wav(pcm).toString("base64"), mimeType: "audio/wav",
      model: MODEL, thinkingLevel: THINKING, timeoutMs: 180_000,
    });
    let text = normalizeTranscriptionText(r.text);
    if (CHATTY.test(text)) {
      // Some chunks get a chatty wrapper every time; after a few tries keep
      // the Sinhala and drop the English sentences around it.
      if (++chattyReplies < 4) throw new Error("chatty English reply, retrying");
      text = text.replace(LATIN_SENTENCE, " ").replace(/\s+/g, " ").trim();
    }
    const problem = checkText(text, pcm);
    if (problem) throw new Error(problem);
    return { text, usage: r.usage };
  }, label);
}

/**
 * Sanity limits for one chunk's text. Real Sinhala speech here runs at most
 * ~13 chars per second of chunk; a chunk far above that is the model inventing
 * fluent text (it happened over music and pauses). Far below is dropped speech.
 */
function checkText(text: string, pcm: Int16Array): string | null {
  const seconds = pcm.length / SR;
  const speechSecs = levels(pcm, SR / 2).filter((v) => v > SPEECH_DB).length / 2;
  if (CHATTY.test(text)) return "English reply instead of a transcript";
  if (text.length > 25 * seconds + 50) return `too much text (${text.length} chars in ${Math.round(seconds)}s): invented`;
  if (speechSecs > 10 && text.length < speechSecs * 2) return `too little text (${text.length} chars for ${speechSecs}s of speech)`;
  return null;
}

interface Chunk { text: string; usage: Usage | null; start: number; end: number }

async function runPass(pcm: Int16Array, cuts: number[], dir: string, tag: string): Promise<Chunk[]> {
  mkdirSync(dir, { recursive: true });
  const bounds = [0, ...cuts, pcm.length / SR];
  const idx = bounds.slice(0, -1).map((_, i) => i);
  await pool(idx, CONC, async (i) => {
    const cache = join(dir, `c${String(i).padStart(3, "0")}.json`);
    const seg = pcm.subarray(Math.floor(bounds[i] * SR), Math.floor(bounds[i + 1] * SR));
    // Re-check cached chunks too, so a tightened check applies to old runs.
    if (existsSync(cache) && !checkText(JSON.parse(readFileSync(cache, "utf8")).text, seg)) return;
    const r = await transcribeChunk(seg, `${tag}/c${i}`);
    writeFileSync(cache, JSON.stringify({ ...r, start: bounds[i], end: bounds[i + 1] }));
    process.stdout.write(".");
  });
  return idx.map((i) => JSON.parse(readFileSync(join(dir, `c${String(i).padStart(3, "0")}.json`), "utf8")));
}

/**
 * Approximate time (s) of a run of words: find the chunk (of any pass) whose
 * text contains it and interpolate by word position inside that chunk.
 * Falls back to the run's position in the merged text.
 */
function locate(run: string, chunks: Chunk[], fallbackFraction: number, duration: number): number {
  const needle = keyText(run).trim().split(" ").slice(0, 4).join(" ");
  for (const c of chunks) {
    const hay = keyText(c.text);
    const at = hay.indexOf(` ${needle} `);
    if (at >= 0) {
      const frac = hay.slice(0, at).split(" ").length / Math.max(1, hay.split(" ").length);
      return Math.round(c.start + frac * (c.end - c.start));
    }
  }
  return Math.round(fallbackFraction * duration);
}

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t) % 60).padStart(2, "0")}`;

/** Paragraph breaks at sentence ends roughly every 120 words, for the DOCX. */
function paragraphs(text: string): string[] {
  const words = text.split(" ");
  const out: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= 120 && /[.?!]$/.test(w)) { out.push(cur.join(" ")); cur = []; }
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}

for (const f of files) {
  if (ONLY && !ONLY.has(String(f.idx))) continue;
  const dir = join(WORK, "files", f.base);
  mkdirSync(dir, { recursive: true });
  const resultPath = join(dir, "result.json");
  if (existsSync(resultPath)) { console.log(`skip (done) ${f.name}`); continue; }
  console.log(`== ${f.name}`);

  // Both channels as 16 kHz mono raw PCM, written atomically and kept in
  // $WORK (~55 MB per channel-hour), so reruns never download again: Drive
  // blocks a shared file for ~24 h ("Quota exceeded") after a few full
  // downloads. A local copy in $WORK/source/<file name> is used if present.
  const Lp = join(dir, "left.raw"), Rp = join(dir, "right.raw");
  if (!existsSync(Rp)) {
    // Match the original Drive name loosely ("1 ii.wav" ≈ "1_ii.wav").
    const loose = (n: string) => n.toLowerCase().replace(/[\s_]+/g, "");
    const sourceDir = join(WORK, "source");
    const match = existsSync(sourceDir) ? readdirSync(sourceDir).find((n) => loose(n) === loose(f.name)) : undefined;
    const local = join(sourceDir, match ?? f.name);
    const src = existsSync(local) ? local : join(dir, "source.part");
    if (!existsSync(local)) {
      const url = `https://drive.usercontent.google.com/download?id=${f.id}&export=download&confirm=t`;
      // curl, not ffmpeg's own HTTP client: Drive refuses the latter at times.
      await retry(async () => {
        execFileSync("curl", ["-sSfL", "--retry", "3", "-o", src, url]);
        const head = readFileSync(src).subarray(0, 300).toString();
        if (head.includes("Quota exceeded")) throw new Error(`Drive download quota exceeded for ${f.name}: wait ~24 h, or put the file in ${join(WORK, "source")}`);
        if (!head.startsWith("RIFF")) throw new Error("Drive did not return a WAV file");
      }, `download ${f.name}`, 5);
    }
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", src,
      "-filter_complex", "[0:a]channelsplit=channel_layout=stereo[l][r]",
      "-map", "[l]", "-ar", String(SR), "-f", "s16le", Lp + ".part",
      "-map", "[r]", "-ar", String(SR), "-f", "s16le", Rp + ".part"], { stdio: "inherit" });
    renameSync(Lp + ".part", Lp); renameSync(Rp + ".part", Rp);
    if (src !== local) rmSync(src);
  }
  const L = readPcm(Lp), R = readPcm(Rp);
  const duration = Math.min(L.length, R.length) / SR;

  // Channel choice from the whole file.
  const usages: { kind: string; usage: Usage | null }[] = [];
  const st = channelStats(L, R);
  let used: "L" | "R" | "MIX";
  let langs = { L: "-", R: "-" };
  if (st.speechL < st.speechR * 0.02) used = "R";
  else if (st.speechR < st.speechL * 0.02) used = "L";
  else if (st.different < st.both * 0.05 && st.speechL - st.both < 10 && st.speechR - st.both < 10) used = "R"; // same audio on both
  else {
    langs = { L: await channelLanguage(L, usages, "L"), R: await channelLanguage(R, usages, "R") };
    used = langs.L === "SINHALA" && langs.R === "SINHALA" ? "MIX" : langs.R === "SINHALA" ? "R" : langs.L === "SINHALA" ? "L" : (() => { throw new Error(`No Sinhala channel in ${f.name}`); })();
  }
  let pcm: Int16Array;
  if (used === "MIX") {
    pcm = new Int16Array(Math.min(L.length, R.length));
    for (let i = 0; i < pcm.length; i++) pcm[i] = (L[i] + R[i]) >> 1;
  } else pcm = used === "L" ? L : R;
  console.log(`  speech L=${st.speechL}s R=${st.speechR}s both=${st.both}s differ=${st.different}s lang L=${langs.L} R=${langs.R} → ${used}`);

  // Three passes whose chunk boundaries never coincide (first cut at ~120 s,
  // ~60 s and ~30 s). Pass A is the base; B and C can each fill a gap in it,
  // but only with words the remaining pass also heard (2-of-3 vote).
  const passes: Chunk[][] = [];
  for (const [tag, first] of PASSES) {
    const p = await runPass(pcm, cutPoints(pcm, first), join(dir, `pass${tag}`), `${f.base}/${tag}`);
    for (const c of p) usages.push({ kind: `chunk-${tag}`, usage: c.usage });
    passes.push(p);
  }
  console.log();
  const [textA, textB, textC] = passes.map((p) => p.map((c) => c.text).join(" "));
  const heardBy = (t: string) => (run: string) => keyText(t).includes(keyText(run));
  // B fills a gap in A only if C heard it too; then C fills gaps B also
  // heard. Words only A produced stay, flagged for review.
  const ab = mergeTranscripts(textA, textB, heardBy(textC), (run) => heardBy(textB)(run) || heardBy(textC)(run));
  const abc = mergeTranscripts(ab.text, textC, heardBy(textB));
  const mergedText = abc.text;
  const totalWords = mergedText.split(" ").length;
  const allChunks = passes.flat();
  const place = (r: Run) => ({ text: r.text, seconds: locate(r.text, allChunks, r.at / totalWords, duration) });
  const restored = [...ab.inserted, ...abc.inserted].map(place);
  // A run rejected in one merge but inserted by the other is not doubtful.
  const doubtful = [...ab.rejected, ...abc.rejected].filter((r) => !keyText(mergedText).includes(keyText(r.text))).map(place);
  // Long stretches only pass A heard: kept, but worth a listen.
  const onlyA = ab.unconfirmed.filter((r) => r.text.split(" ").length >= 8).map(place);
  // Chunks of pass A far denser than the file's norm may contain invented text.
  const rate = (c: Chunk) => c.text.length / Math.max(1, c.end - c.start);
  const rates = passes[0].map(rate).sort((x, y) => x - y);
  const median = rates[Math.floor(rates.length / 2)];
  const dense = passes[0].filter((c) => c.end - c.start > 30 && rate(c) > 1.7 * median)
    .map((c) => ({ text: c.text.slice(0, 120), seconds: Math.round((c.start + c.end) / 2) }));
  const repeats = stutters(mergedText).map((r) => ({ text: r.text, seconds: locate(r.text, allChunks, r.at / totalWords, duration) }));

  // A 30 s clip around each spot to check by ear.
  mkdirSync(join(OUT, "review"), { recursive: true });
  for (const spot of [...doubtful, ...onlyA, ...dense, ...repeats]) {
    const from = Math.max(0, spot.seconds - 15);
    const clip = join(OUT, "review", `${f.base}_${mmss(from).replace(":", "m")}s.mp3`);
    if (!existsSync(clip)) {
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "s16le", "-ar", String(SR), "-ac", "1",
        "-ss", String(from), "-t", "30", "-i", used === "L" ? Lp : Rp, "-c:a", "libmp3lame", "-b:a", "64k", clip]);
    }
  }
  const speechSeconds = levels(pcm, SR).filter((v) => v > SPEECH_DB).length;

  const result = {
    idx: f.idx, name: f.name, base: f.base, durationSeconds: duration, speechSeconds,
    channels: { ...st, langs, used }, model: MODEL, thinkingLevel: THINKING,
    passWords: [textA, textB, textC].map((t) => t.split(" ").length),
    restored, doubtful, onlyA, dense, repeats,
    paragraphs: paragraphs(mergedText), usages,
  };
  writeFileSync(resultPath, JSON.stringify(result, null, 1));
  writeFileSync(join(OUT, "txt", `${f.base}.txt`), result.paragraphs.join("\n\n") + "\n");
  console.log(`  done ${f.name}: ${result.passWords.join("/")} words per pass → ${totalWords} merged; restored ${restored.length}; to review ${doubtful.length} single-pass, ${onlyA.length} pass-A-only, ${dense.length} dense, ${repeats.length} repeats`);
}
