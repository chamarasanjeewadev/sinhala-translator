// Internal cost sheet: actual Gemini tokens per file priced with the admin
// dashboard table (hela-voice-admin gemini-pricing.ts, a sibling checkout in
// this workspace). Credits = 1 per started minute of decoded audio. Not for
// the client.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { estimateCostUsd } from "../../../hela-voice-admin/src/lib/gemini-pricing.ts";

const WORK = process.env.WORK!, OUT = process.env.OUT!;
type Usage = { promptTokens: number; outputTokens: number; thoughtsTokens: number };
const files = readFileSync(join(WORK, "ids.txt"), "utf8").trim().split("\n").map((l) => l.split(" ")[1]);
const rows = ["file,duration_s,credits,channel_used,requests,prompt_tokens,output_tokens,thoughts_tokens,gemini_cost_usd"];
let cost = 0, secs = 0, credits = 0;
for (const name of files) {
  const r = JSON.parse(readFileSync(join(WORK, "files", name.replace(/\.wav$/i, "").replace(/\s+/g, "_"), "result.json"), "utf8"));
  const u: Usage[] = r.usages.map((x: { usage: Usage | null }) => x.usage).filter(Boolean);
  const sum = (k: keyof Usage) => u.reduce((a, x) => a + x[k], 0);
  const c = estimateCostUsd(r.model, sum("promptTokens"), sum("outputTokens"), sum("thoughtsTokens"));
  const cr = Math.max(1, Math.ceil(r.durationSeconds / 60));
  cost += c; secs += r.durationSeconds; credits += cr;
  rows.push([name, r.durationSeconds.toFixed(1), cr, r.channels.used, r.usages.length, sum("promptTokens"), sum("outputTokens"), sum("thoughtsTokens"), c.toFixed(4)].join(","));
}
rows.push(["TOTAL", secs.toFixed(1), credits, "", "", "", "", "", cost.toFixed(4)].join(","));
mkdirSync(join(OUT, "internal"), { recursive: true });
writeFileSync(join(OUT, "internal", "gemini-cost-sheet.csv"), rows.join("\n") + "\n");
console.log(`${(secs / 60).toFixed(1)} min, ${credits} credits, Gemini cost $${cost.toFixed(2)}`);
