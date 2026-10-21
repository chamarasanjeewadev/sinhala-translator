// Client-side export of a transcription to TXT / Markdown / Word / PDF.
// Everything runs in the browser — no upload, no extra credits.
//
// Transcripts are lightly-formatted markdown (the edit modal's toolbar adds
// headings, lists, bold, italic), so a tiny block/inline parser drives both the
// Word and the PDF output.

export type ExportFormat = "pdf" | "docx" | "txt" | "md";

export interface ExportSource {
  id: string;
  title: string | null;
  createdAt: string;
  sinhala: string;
  english: string | null;
  /** Section headings, already localized. */
  labels: { sinhala: string; english: string };
}

// ── Markdown subset ──

export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; runs: InlineRun[] }
  | { kind: "bullet"; runs: InlineRun[] }
  | { kind: "paragraph"; runs: InlineRun[] };

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;

export function parseInline(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    const token = m[0];
    if (token.startsWith("**")) runs.push({ text: token.slice(2, -2), bold: true });
    else runs.push({ text: token.slice(1, -1), italic: true });
    last = m.index + token.length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length ? runs : [{ text: "" }];
}

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        runs: parseInline(heading[2]),
      });
      continue;
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      blocks.push({ kind: "bullet", runs: parseInline(bullet[1]) });
      continue;
    }
    blocks.push({ kind: "paragraph", runs: parseInline(line.trim()) });
  }
  return blocks;
}

// ── Helpers ──

function fileBase(src: ExportSource): string {
  const date = src.createdAt.slice(0, 10);
  return `helavoice-${date}-${src.id.slice(0, 8)}`;
}

function docTitle(src: ExportSource): string {
  return src.title?.trim() || "HelaVoice transcription";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sections(src: ExportSource): { label: string; body: string }[] {
  const out = [{ label: src.labels.sinhala, body: src.sinhala }];
  if (src.english?.trim()) out.push({ label: src.labels.english, body: src.english });
  return out;
}

// ── Plain text / Markdown ──

function stripMarkdown(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^#{1,3}\s+/, "").replace(/^(\s*)[*+]\s+/, "$1- "))
    .join("\n")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\s][^*]*)\*/g, "$1");
}

export function buildText(src: ExportSource): string {
  const parts = sections(src);
  if (parts.length === 1) return stripMarkdown(src.sinhala);
  return parts.map((p) => `${p.label}\n\n${stripMarkdown(p.body)}`).join("\n\n\n");
}

export function buildMarkdown(src: ExportSource): string {
  const head = `# ${docTitle(src)}\n\n_${formatDate(src.createdAt)}_\n\n`;
  const parts = sections(src);
  if (parts.length === 1) return head + src.sinhala + "\n";
  return head + parts.map((p) => `## ${p.label}\n\n${p.body}`).join("\n\n") + "\n";
}

// ── Word (.docx) ──

// Iskoola Pota ships with Windows and Office; other systems substitute their
// Sinhala font. Word shapes Sinhala itself, so text stays real, editable Unicode.
const DOCX_FONT = { ascii: "Calibri", hAnsi: "Calibri", cs: "Iskoola Pota" };

export async function buildDocx(src: ExportSource): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

  const runs = (inline: InlineRun[], size = 24) =>
    inline.map(
      (r) =>
        new TextRun({
          text: r.text,
          bold: r.bold,
          boldComplexScript: r.bold,
          italics: r.italic,
          italicsComplexScript: r.italic,
          font: DOCX_FONT,
          size,
          sizeComplexScript: size,
        })
    );

  const headingLevel = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
  } as const;

  const children = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: runs([{ text: docTitle(src) }], 40),
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: formatDate(src.createdAt), color: "666666", size: 20, font: DOCX_FONT }),
      ],
    }),
  ];

  const parts = sections(src);
  for (const part of parts) {
    if (parts.length > 1) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240 },
          children: runs([{ text: part.label, bold: true }], 30),
        })
      );
    }
    for (const block of parseBlocks(part.body)) {
      if (block.kind === "heading") {
        children.push(
          new Paragraph({
            heading: headingLevel[block.level],
            children: runs(block.runs, [0, 32, 28, 26][block.level]),
          })
        );
      } else if (block.kind === "bullet") {
        children.push(new Paragraph({ bullet: { level: 0 }, children: runs(block.runs) }));
      } else {
        children.push(
          new Paragraph({ spacing: { after: 160, line: 360 }, children: runs(block.runs) })
        );
      }
    }
  }

  const doc = new Document({
    creator: "HelaVoice.lk",
    title: docTitle(src),
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}

// ── PDF (via the browser's print engine) ──
//
// JS PDF libraries don't shape Sinhala (vowel signs, conjuncts break), so the
// PDF is produced by the browser's own print-to-PDF, which shapes correctly
// and keeps the text selectable/searchable.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineHtml(runs: InlineRun[]): string {
  return runs
    .map((r) => {
      let h = escapeHtml(r.text);
      if (r.bold) h = `<strong>${h}</strong>`;
      if (r.italic) h = `<em>${h}</em>`;
      return h;
    })
    .join("");
}

function blocksHtml(blocks: Block[]): string {
  let html = "";
  let inList = false;
  for (const b of blocks) {
    if (b.kind === "bullet") {
      if (!inList) html += "<ul>";
      inList = true;
      html += `<li>${inlineHtml(b.runs)}</li>`;
      continue;
    }
    if (inList) html += "</ul>";
    inList = false;
    html +=
      b.kind === "heading"
        ? `<h${b.level + 1}>${inlineHtml(b.runs)}</h${b.level + 1}>`
        : `<p>${inlineHtml(b.runs)}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

export function buildPrintHtml(src: ExportSource): string {
  const parts = sections(src);
  const body = parts
    .map(
      (p) =>
        `<section>${parts.length > 1 ? `<h2 class="label">${escapeHtml(p.label)}</h2>` : ""}${blocksHtml(
          parseBlocks(p.body)
        )}</section>`
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(fileBase(src))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Inter", "Noto Sans Sinhala", sans-serif; color: #111c2d; font-size: 12pt; line-height: 1.9; }
  h1 { font-size: 20pt; margin: 0 0 2pt; }
  .meta { color: #666; font-size: 9.5pt; margin-bottom: 14pt; }
  h2.label { font-size: 13pt; color: #340075; border-bottom: 1px solid #e7eeff; padding-bottom: 3pt; margin-top: 18pt; }
  h2, h3, h4 { margin: 12pt 0 4pt; }
  p { margin: 0 0 8pt; white-space: pre-wrap; }
  footer { margin-top: 24pt; color: #999; font-size: 8.5pt; }
</style></head><body>
<h1>${escapeHtml(docTitle(src))}</h1>
<div class="meta">${escapeHtml(formatDate(src.createdAt))}</div>
${body}
<footer>helavoice.lk</footer>
</body></html>`;
}

function printPdf(src: ExportSource): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(buildPrintHtml(src));
    doc.close();

    const win = iframe.contentWindow!;
    const go = async () => {
      try {
        await Promise.race([win.document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
      } catch {
        // fonts API unavailable — print with fallback fonts
      }
      win.focus();
      win.print();
      setTimeout(() => iframe.remove(), 60_000);
      resolve();
    };
    if (doc.readyState === "complete") void go();
    else iframe.onload = () => void go();
  });
}

// ── Entry point ──

export async function exportTranscript(src: ExportSource, format: ExportFormat) {
  const base = fileBase(src);
  switch (format) {
    case "txt":
      saveBlob(new Blob([buildText(src)], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
      return;
    case "md":
      saveBlob(new Blob([buildMarkdown(src)], { type: "text/markdown;charset=utf-8" }), `${base}.md`);
      return;
    case "docx":
      saveBlob(await buildDocx(src), `${base}.docx`);
      return;
    case "pdf":
      await printPdf(src);
      return;
  }
}
