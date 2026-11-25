import {
  AudioLines,
  Captions,
  Keyboard,
  Languages,
  Mic,
  QrCode,
  ScanText,
  Speech,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHUNK_DURATION_SECONDS } from "@/lib/constants";
import { t } from "@/lib/i18n/utils";

// Tinted tile + saturated icon, per the 2026-11 logo pack's "Icon Style" panel.
export const TONES = {
  mint: "bg-[#e6f4ec] text-[#16a34a]",
  peach: "bg-[#fff1e0] text-[#ea8a00]",
  lilac: "bg-[#f3ecff] text-[#7c3aed]",
  sky: "bg-[#e3f6fb] text-[#0891b2]",
  pink: "bg-[#fde9f3] text-[#db2777]",
  blue: "bg-[#e8f0ff] text-[#2563eb]",
  red: "bg-[#ffe4e1] text-[#dc2626]",
} as const;
export type Tone = keyof typeof TONES;

/** What a tool costs. Mirrors the API routes: free = no credits ever; trial = a free allowance on an account, then credits; credits = every use is paid from credits. */
export type ToolCost = "free" | "trial" | "credits";

export type ToolKey = "transcribe" | "subtitles" | "singlishTool" | "voiceTyping" | "translate" | "textToSpeech" | "scanToText" | "qrGenerator";

export const TOOLS: {
  key: ToolKey;
  href: string;
  /** Logged-in href when it differs from the public page. */
  appHref?: string;
  icon: LucideIcon;
  tone: Tone;
  isNew: boolean;
  cost: ToolCost;
}[] = [
  { key: "transcribe", href: "/sinhala-audio-to-text", appHref: "/dashboard", icon: Mic, tone: "mint", isNew: false, cost: "credits" },
  { key: "subtitles", href: "/subtitles", appHref: "/dashboard/subtitles", icon: Captions, tone: "pink", isNew: false, cost: "credits" },
  { key: "textToSpeech", href: "/sinhala-text-to-speech", icon: AudioLines, tone: "sky", isNew: true, cost: "trial" },
  { key: "scanToText", href: "/sinhala-scan-to-text", icon: ScanText, tone: "lilac", isNew: true, cost: "trial" },
  { key: "translate", href: "/english-to-sinhala", icon: Languages, tone: "peach", isNew: true, cost: "free" },
  { key: "voiceTyping", href: "/sinhala-voice-typing", icon: Speech, tone: "red", isNew: true, cost: "free" },
  { key: "singlishTool", href: "/singlish-to-sinhala", icon: Keyboard, tone: "lilac", isNew: true, cost: "free" },
  { key: "qrGenerator", href: "/qr-code-generator", icon: QrCode, tone: "blue", isNew: false, cost: "free" },
];

/** Transcription bills 1 credit per started chunk, so its rate is "per N minutes". */
export const CHUNK_MINUTES = CHUNK_DURATION_SECONDS / 60;

/** dict.navbar.costNote[key] with the chunk length filled in. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function costNote(nav: any, key: ToolKey): string {
  return t(nav.costNote[key], { chunkMin: CHUNK_MINUTES });
}

export const FREE_TOOLS = TOOLS.filter((t) => t.cost === "free");
export const PAID_TOOLS = TOOLS.filter((t) => t.cost !== "free");

const COST_STYLES: Record<ToolCost, string> = {
  free: "bg-[#e3f3e8] text-[#1d6b47]",
  trial: "bg-[#fff1e0] text-[#9a4a16]",
  credits: "bg-[#15201b] text-white",
};

/** The one free/paid label used everywhere a tool is listed. `labels` comes from dict.navbar. */
export function CostBadge({
  cost,
  labels,
  className,
}: {
  cost: ToolCost;
  labels: { costFree: string; costTrial: string; costCredits: string };
  className?: string;
}) {
  const text = cost === "free" ? labels.costFree : cost === "trial" ? labels.costTrial : labels.costCredits;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none tracking-wide",
        COST_STYLES[cost],
        className,
      )}
    >
      {text}
    </span>
  );
}

const TILE_SIZES = {
  sm: "h-7 w-7 rounded-lg [&>svg]:h-4 [&>svg]:w-4",
  md: "h-10 w-10 rounded-xl [&>svg]:h-5 [&>svg]:w-5",
  lg: "h-12 w-12 rounded-2xl [&>svg]:h-6 [&>svg]:w-6",
} as const;

export function IconTile({
  icon: Icon,
  tone,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  size?: keyof typeof TILE_SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]",
        TONES[tone],
        TILE_SIZES[size],
        className,
      )}
    >
      <Icon strokeWidth={2.2} />
    </span>
  );
}
