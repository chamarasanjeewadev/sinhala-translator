import { describe, expect, it } from "vitest";
import {
  buildDocx,
  buildMarkdown,
  buildPrintHtml,
  buildText,
  parseBlocks,
  type ExportSource,
} from "../transcript-export";

const src: ExportSource = {
  id: "abcdef123456",
  title: null,
  createdAt: "2026-10-20T10:00:00Z",
  sinhala: "## මාතෘකාව\n\nමම **ගෙදර** යනවා.\n- එක\n- දෙක <b>",
  english: "I am going *home*.",
  labels: { sinhala: "Sinhala", english: "English" },
};

describe("parseBlocks", () => {
  it("parses headings, bullets and inline styles", () => {
    const blocks = parseBlocks(src.sinhala);
    expect(blocks.map((b) => b.kind)).toEqual(["heading", "paragraph", "bullet", "bullet"]);
    expect(blocks[1].runs).toEqual([
      { text: "මම " },
      { text: "ගෙදර", bold: true },
      { text: " යනවා." },
    ]);
  });
});

describe("text exports", () => {
  it("strips markdown in plain text and includes both languages", () => {
    const t = buildText(src);
    expect(t).toContain("මාතෘකාව\n\nමම ගෙදර යනවා.");
    expect(t).toContain("English\n\nI am going home.");
  });

  it("sinhala-only text has no section labels", () => {
    expect(buildText({ ...src, english: null })).not.toContain("Sinhala");
  });

  it("markdown keeps formatting", () => {
    expect(buildMarkdown(src)).toContain("**ගෙදර**");
  });

  it("print html escapes content", () => {
    const html = buildPrintHtml(src);
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("<strong>ගෙදර</strong>");
  });
});

describe("docx", () => {
  it("produces a Word file containing the Sinhala text", async () => {
    const blob = await buildDocx(src);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("ගෙදර");
    expect(xml).toContain('w:cs="Iskoola Pota"');
  });
});
