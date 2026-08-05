"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Captions, Lock, Play, Sparkles } from "lucide-react";
import { localePath, t } from "@/lib/i18n/utils";
import type { Locale } from "@/lib/i18n/config";

type HeroCopy = {
  heroBadge: string;
  heroEyebrow: string;
  heroTitle1: string;
  heroTitle2: string;
  heroSubtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  previewLabel: string;
  previewLang: string;
  exportsIntro: string;
  privacyBadge: string;
  rateBadge: string;
};

type SubtitlesHeroProps = {
  locale: Locale;
  copy: HeroCopy;
  creditRate: number;
};

// Authentic caption demo — Sinhala subtitle line plus its English translation,
// mirroring the editor's translate feature. Same content in both locales.
const CAPTION_LINES = [
  { si: "ආයුබෝවන්, අද අපි කතා කරන්නේ...", en: "Hello, today we're talking about..." },
  { si: "මේ වීඩියෝවට උපසිරැසි එකතු කරමු.", en: "Let's add subtitles to this video." },
  { si: "තත්පර කිහිපයකින්, ඉතා නිවැරදිව.", en: "In just seconds, and accurately." },
];

const EXPORT_TARGETS = ["SRT", "VTT", "MP4", "YouTube", "TikTok", "Reels", "CapCut"];

// Segment blocks drawn under the frame — widths roughly track caption length.
const TIMELINE_BLOCKS = [22, 30, 16, 26, 18];

function SubtitlePreview({ label, langLabel }: { label: string; langLabel: string }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "hold">("typing");

  const line = CAPTION_LINES[lineIndex];
  const progress = line.si.length ? charIndex / line.si.length : 0;

  useEffect(() => {
    if (phase === "typing") {
      if (charIndex < line.si.length) {
        const id = window.setTimeout(() => setCharIndex((c) => c + 1), 58);
        return () => window.clearTimeout(id);
      }
      const id = window.setTimeout(() => setPhase("hold"), 1400);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setCharIndex(0);
      setLineIndex((i) => (i + 1) % CAPTION_LINES.length);
      setPhase("typing");
    }, 460);
    return () => window.clearTimeout(id);
  }, [charIndex, line.si.length, phase]);

  // Playhead sweeps across the whole track: completed blocks + current progress.
  const totalUnits = CAPTION_LINES.length;
  const playhead = ((lineIndex + progress) / totalUnits) * 100;

  return (
    <div
      className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(124,58,237,0.45)]"
      style={{ animation: "heroFadeUp .8s cubic-bezier(.22,1,.36,1) .3s both" }}
    >
      {/* The "video" frame */}
      <div className="relative aspect-video overflow-hidden rounded-[1.2rem] bg-[radial-gradient(120%_120%_at_20%_0%,#3b1a78_0%,#1a0838_45%,#0b0118_100%)]">
        {/* Ambient scene light */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(232,121,249,0.35),transparent_65%)] blur-xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.4),transparent_60%)] blur-xl" />

        {/* Top chrome: language + CC */}
        <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-3">
          <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur">
            <span style={{ fontFamily: "var(--font-noto-sinhala)" }}>{langLabel}</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
            <Captions className="h-3 w-3" strokeWidth={2.5} />
            CC
          </span>
        </div>

        {/* Center play control */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-md sub-play-pulse">
            <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
          </span>
        </div>

        {/* Burned-in caption — the authentic subtitle overlay */}
        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-1.5 px-4 text-center">
          <span className="max-w-[92%] rounded-md bg-black/70 px-2.5 py-1 text-[13px] font-semibold leading-snug text-white">
            <span style={{ fontFamily: "var(--font-noto-sinhala)" }}>
              {line.si.slice(0, charIndex)}
            </span>
            <span className="hero-caret ml-0.5 inline-block h-3.5 w-px align-middle" />
          </span>
          {progress > 0.55 && (
            <span
              className="rounded bg-black/45 px-2 py-0.5 text-[10px] font-medium text-amber-200/90 transition-opacity duration-300"
              style={{ opacity: Math.min(1, (progress - 0.55) / 0.25) }}
            >
              {line.en}
            </span>
          )}
        </div>
      </div>

      {/* Mini editor timeline */}
      <div className="relative px-2 pb-1.5 pt-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="hero-live-dot absolute inset-0 rounded-full bg-emerald-400" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            {label}
          </span>
        </div>
        <div className="relative flex h-7 items-center gap-1.5">
          {TIMELINE_BLOCKS.map((width, i) => (
            <span
              key={i}
              className="h-full rounded-[5px] border border-violet-400/30 bg-gradient-to-b from-violet-500/40 to-violet-700/40"
              style={{ flexGrow: width }}
            />
          ))}
          {/* Playhead */}
          <span
            className="absolute top-[-4px] bottom-[-4px] w-px bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]"
            style={{ left: `${playhead}%` }}
          >
            <span className="absolute -left-[3px] -top-1 h-[7px] w-[7px] rounded-full bg-rose-400" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function SubtitlesHero({ locale, copy, creditRate }: SubtitlesHeroProps) {
  return (
    <section className="hero-noise relative overflow-hidden bg-[linear-gradient(155deg,#07000f_0%,#0d0020_52%,#150033_100%)] text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.22)_0%,transparent_60%)] hero-glow-slow" />
      <div className="pointer-events-none absolute -bottom-24 left-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(232,121,249,0.12)_0%,transparent_65%)] hero-glow-delayed" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(124,58,237,.5)_30%,rgba(232,121,249,.4)_70%,transparent)]" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-14 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:py-24">
        {/* Copy column */}
        <div className="lg:w-[52%]">
          <div
            className="inline-flex items-center gap-2 self-start rounded-full border border-violet-400/25 bg-violet-500/12 px-3 py-1.5"
            style={{ animation: "heroFadeUp .55s cubic-bezier(.22,1,.36,1) both" }}
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
              {copy.heroBadge}
            </span>
          </div>

          <p
            className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-violet-300/90 sm:text-[13px]"
            style={{ animation: "heroFadeUp .55s cubic-bezier(.22,1,.36,1) .05s both" }}
          >
            {copy.heroEyebrow}
          </p>

          <h1
            className="mt-3 font-display text-[clamp(2.3rem,5vw,4.2rem)] font-black leading-[1.05] tracking-tight"
            style={{ animation: "heroFadeUp .6s cubic-bezier(.22,1,.36,1) .09s both" }}
          >
            {copy.heroTitle1}
            <br />
            <span className="hero-gradient-text">{copy.heroTitle2}</span>
          </h1>

          <p
            className="mt-6 max-w-[46ch] text-[clamp(.95rem,1.5vw,1.08rem)] leading-relaxed text-white/60"
            style={{ animation: "heroFadeUp .6s cubic-bezier(.22,1,.36,1) .15s both" }}
          >
            {copy.heroSubtitle}
          </p>

          <div
            className="mt-9 flex flex-wrap gap-3"
            style={{ animation: "heroFadeUp .6s cubic-bezier(.22,1,.36,1) .21s both" }}
          >
            <Link
              href={localePath("/dashboard/subtitles", locale)}
              className="hero-primary-button inline-flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-bold text-white"
            >
              <Captions className="h-[15px] w-[15px]" />
              <span>{copy.ctaPrimary}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3.5 text-sm font-semibold text-white/65 transition-colors hover:text-white"
            >
              {copy.ctaSecondary} <span className="ml-1">↓</span>
            </a>
          </div>

          {/* Trust row */}
          <div
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3"
            style={{ animation: "heroFadeUp .6s cubic-bezier(.22,1,.36,1) .27s both" }}
          >
            <span className="inline-flex items-center gap-2 text-xs text-white/50">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/15">
                <Lock className="h-2.5 w-2.5 text-emerald-300" />
              </span>
              <span className="font-medium text-white/75">{copy.privacyBadge}</span>
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span className="font-medium text-white/75">
                {t(copy.rateBadge, { rate: creditRate })}
              </span>
            </span>
          </div>

          {/* Export targets marquee */}
          <div
            className="mt-10"
            style={{ animation: "heroFadeUp .6s cubic-bezier(.22,1,.36,1) .33s both" }}
          >
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
              {copy.exportsIntro}
            </p>
            <div className="flex flex-wrap gap-2">
              {EXPORT_TARGETS.map((target) => (
                <span
                  key={target}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] font-medium text-white/60"
                >
                  {target}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Signature: animated subtitle preview */}
        <div className="flex justify-center lg:w-[48%]">
          <SubtitlePreview label={copy.previewLabel} langLabel={copy.previewLang} />
        </div>
      </div>
    </section>
  );
}
