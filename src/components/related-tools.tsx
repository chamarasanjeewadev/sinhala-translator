import Link from "next/link";
import { TOOLS, IconTile, CostBadge, type ToolKey } from "@/components/tool-catalog";
import { localePath } from "@/lib/i18n/utils";
import type { Locale } from "@/lib/i18n/config";

// Crawlable links between the public tool pages: the navbar's Tools menu only renders its links once opened.
const LINKS: { id: string; href: string; tool: ToolKey }[] = [
  { id: "transcribe", href: "/", tool: "transcribe" },
  { id: "audioToText", href: "/sinhala-audio-to-text", tool: "transcribe" },
  { id: "voiceTyping", href: "/sinhala-voice-typing", tool: "voiceTyping" },
  { id: "siEn", href: "/sinhala-to-english", tool: "translate" },
  { id: "enSi", href: "/english-to-sinhala", tool: "translate" },
  { id: "subtitles", href: "/subtitles", tool: "subtitles" },
  { id: "textToSpeech", href: "/sinhala-text-to-speech", tool: "textToSpeech" },
  { id: "scanToText", href: "/sinhala-scan-to-text", tool: "scanToText" },
];

export function RelatedTools({
  locale,
  copy,
  current,
  labels,
}: {
  locale: Locale;
  copy: { title: string; items: Record<string, { label: string; desc: string }> };
  current?: string;
  /** dict.navbar, for the free / credits badge. */
  labels: { costFree: string; costTrial: string; costCredits: string };
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20">
      <h2 className="text-center font-display text-2xl sm:text-3xl font-bold mb-8">{copy.title}</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LINKS.filter((l) => l.id !== current).map((l) => {
          const tool = TOOLS.find((t) => t.key === l.tool)!;
          const item = copy.items[l.id];
          return (
            <li key={l.id}>
              <Link
                href={localePath(l.href, locale).replace(/(.)\/$/, "$1")}
                className="flex h-full items-start gap-3 rounded-2xl bg-white/60 border border-ink/10 p-4 transition-colors hover:border-leaf/30 hover:bg-white/80"
              >
                <IconTile icon={tool.icon} tone={tool.tone} />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink">
                    {item.label}
                    <CostBadge cost={tool.cost} labels={labels} />
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink/65">{item.desc}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
