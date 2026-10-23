// Writes one .docx per finished transcript in $WORK/files, using the web
// app's own buildDocx (same output as a helavoice.lk Word export).
// Titles come from $WORK/titles.json ({ "<file base>": "Title" }) if present,
// else the file name. See README.md.
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildDocx } from "../../src/lib/transcript-export.ts";

const WORK = process.env.WORK!, OUT = process.env.OUT!;
mkdirSync(join(OUT, "docx"), { recursive: true });
const titlesPath = join(WORK, "titles.json");
const titles: Record<string, string> = existsSync(titlesPath) ? JSON.parse(readFileSync(titlesPath, "utf8")) : {};

let n = 0;
for (const d of readdirSync(join(WORK, "files"))) {
  const p = join(WORK, "files", d, "result.json");
  if (!existsSync(p)) continue;
  const r = JSON.parse(readFileSync(p, "utf8"));
  const blob = await buildDocx({
    id: r.base, title: titles[r.base] ?? r.base, createdAt: new Date().toISOString(),
    sinhala: r.paragraphs.join("\n\n"), english: null,
    labels: { sinhala: "සිංහල", english: "English" },
  });
  writeFileSync(join(OUT, "docx", `${r.base}.docx`), Buffer.from(await blob.arrayBuffer()));
  n++;
}
console.log(`wrote ${n} docx`);
