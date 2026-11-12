import {
  AudioLines,
  Captions,
  Keyboard,
  Languages,
  Mic,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export type ToolKey = "transcribe" | "subtitles" | "singlishTool" | "translate" | "textToSpeech" | "qrGenerator";

export const TOOLS: {
  key: ToolKey;
  href: string;
  /** Logged-in href when it differs from the public page. */
  appHref?: string;
  icon: LucideIcon;
  tone: Tone;
  isNew: boolean;
  /** Shown in the Tools dropdown (transcribe/subtitles have their own nav links). */
  inMenu: boolean;
}[] = [
  { key: "transcribe", href: "/dashboard", icon: Mic, tone: "mint", isNew: false, inMenu: false },
  { key: "subtitles", href: "/subtitles", appHref: "/dashboard/subtitles", icon: Captions, tone: "pink", isNew: false, inMenu: false },
  { key: "singlishTool", href: "/singlish-to-sinhala", icon: Keyboard, tone: "lilac", isNew: true, inMenu: true },
  { key: "translate", href: "/english-to-sinhala", icon: Languages, tone: "peach", isNew: true, inMenu: true },
  { key: "textToSpeech", href: "/sinhala-text-to-speech", icon: AudioLines, tone: "sky", isNew: true, inMenu: true },
  { key: "qrGenerator", href: "/qr-code-generator", icon: QrCode, tone: "blue", isNew: false, inMenu: true },
];

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
