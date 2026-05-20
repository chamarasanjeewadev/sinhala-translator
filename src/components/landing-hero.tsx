"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Mic } from "lucide-react";
import { localePath } from "@/lib/i18n/utils";
import type { Locale } from "@/lib/i18n/config";

type LandingHeroCopy = {
  badge: string;
  eyebrow: string;
  heroTitle1: string;
  heroSubtitle: string;
  startTranscribing: string;
  viewPricing: string;
  noSubscription: string;
};

type LandingHeroProps = {
  locale: Locale;
  copy: LandingHeroCopy;
  freeCreditsLabel: string;
};

const ENGLISH_WORDS = ["transcribed", "translated", "preserved"];
const SINHALA_WORDS = [
  "අකුරටම පරිවර්තනය",
  "ක්ෂණිකව පෙළට",
  "නිවැරදිව සුරකින්න",
];

const ENGLISH_LINES = [
  { sinhala: "ආයුබෝවන් සියලු දෙනාට.", english: "Welcome, everyone." },
  {
    sinhala: "HelaVoice සිංහල කටහඬ නිවැරදිව හඳුනා ගනී.",
    english: "HelaVoice accurately recognizes Sinhala speech.",
  },
  {
    sinhala: "අද අපි නව නිෂ්පාදනය ගැන කතා කරමු.",
    english: "Today we are talking about the new product.",
  },
];

const SINHALA_LINES = [
  { sinhala: "ආයුබෝවන් සියලු දෙනාට.", english: "සියලු දෙනාටම ආයුබෝවන්." },
  {
    sinhala: "HelaVoice සිංහල කටහඬ නිවැරදිව හඳුනා ගනී.",
    english: "HelaVoice සිංහල කටහඬ ඉතා නිවැරදිව හඳුනා ගනී.",
  },
  {
    sinhala: "අද අපි නව නිෂ්පාදනය ගැන කතා කරමු.",
    english: "අද අපි අලුත් නිෂ්පාදනය පිළිබඳ කතා කරමු.",
  },
];

const ENGLISH_TICKER = [
  ["ආයුබෝවන්", "Welcome"],
  ["AI බල ගැන්වූ", "AI Powered"],
  ["නිරවද්‍ය", "Accurate"],
  ["ඉක්මන්", "Fast"],
  ["ලාංකීය", "Sri Lankan"],
  ["ශ්‍රව්‍ය", "Voice"],
  ["පරිවර්තනය", "Transcription"],
  ["ශ්‍රී ලංකාව", "Sri Lanka"],
];

const SINHALA_TICKER = [
  ["ආයුබෝවන්", "සුබ පිළිගැනීමක්"],
  ["AI බල ගැන්වූ", "AI බලයෙන්"],
  ["නිරවද්‍ය", "ඉතා නිවැරදි"],
  ["ඉක්මන්", "වේගවත්"],
  ["ලාංකීය", "ශ්‍රී ලාංකික"],
  ["ශ්‍රව්‍ය", "හඬ"],
  ["පරිවර්තනය", "පෙළට හැරවීම"],
  ["ශ්‍රී ලංකාව", "Sri Lanka"],
];

function CyclingWord({ locale }: { locale: Locale }) {
  const words = locale === "si" ? SINHALA_WORDS : ENGLISH_WORDS;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhase("out");

      window.setTimeout(() => {
        setIndex((current) => (current + 1) % words.length);
        setPhase("in");

        window.setTimeout(() => {
          setPhase("idle");
        }, 420);
      }, 340);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [words.length]);

  const animation =
    phase === "out"
      ? "heroWordOut .34s cubic-bezier(.22,1,.36,1) forwards"
      : phase === "in"
        ? "heroWordIn .42s cubic-bezier(.22,1,.36,1) forwards"
        : "none";

  return (
    <span className="hero-word-clip min-w-[10ch] sm:min-w-[11ch]">
      <span className="hero-gradient-text inline-block" style={{ animation }}>
        {words[index]}
      </span>
    </span>
  );
}

function WaveBars() {
  const bars = Array.from({ length: 30 }, (_, index) => {
    const distance = Math.abs(index - 15) / 15;
    const height = 0.24 + (1 - distance) * 0.76;
    return {
      delay: `${(index % 6) * 0.08}s`,
      duration: `${0.7 + (index % 5) * 0.12}s`,
      height: `${Math.max(18, height * 34)}px`,
    };
  });

  return (
    <div className="flex h-8 items-end gap-[3px]">
      {bars.map((bar, index) => (
        <span
          key={index}
          className="hero-wave-bar w-[3px] rounded-full"
          style={{
            animationDelay: bar.delay,
            animationDuration: bar.duration,
            height: bar.height,
          }}
        />
      ))}
    </div>
  );
}

function LiveCard({ locale }: { locale: Locale }) {
  const lines = locale === "si" ? SINHALA_LINES : ENGLISH_LINES;
  const statLabels =
    locale === "si"
      ? [
          ["99.2%", "නිවැරදිභාවය"],
          ["0.4s", "ප්‍රමාදය"],
          ["1 cr", "පිරිවැය"],
        ]
      : [
          ["99.2%", "Accuracy"],
          ["0.4s", "Latency"],
          ["1 cr", "Cost"],
        ];

  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pause">("typing");

  const line = lines[lineIndex];
  const progress = line.sinhala.length
    ? charIndex / line.sinhala.length
    : 0;

  useEffect(() => {
    if (phase === "typing") {
      if (charIndex < line.sinhala.length) {
        const timeout = window.setTimeout(() => {
          setCharIndex((current) => current + 1);
        }, 55);

        return () => window.clearTimeout(timeout);
      }

      const timeout = window.setTimeout(() => {
        setPhase("pause");
      }, 1500);

      return () => window.clearTimeout(timeout);
    }

    const timeout = window.setTimeout(() => {
      setCharIndex(0);
      setLineIndex((current) => (current + 1) % lines.length);
      setPhase("typing");
    }, 480);

    return () => window.clearTimeout(timeout);
  }, [charIndex, line.sinhala.length, lineIndex, lines.length, phase]);

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/6 backdrop-blur-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="hero-live-dot absolute inset-0 rounded-full bg-emerald-400" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
          {locale === "si" ? "සජීවී පරිවර්තනය" : "Live transcription"}
        </span>
        <div className="ml-auto flex gap-1">
          {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
            <span
              key={color}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        <WaveBars />
        <p className="mt-3 font-sans text-[0.95rem] font-semibold leading-8 text-white sm:text-base">
          <span style={{ fontFamily: "var(--font-noto-sinhala)" }}>
            {line.sinhala.slice(0, charIndex)}
          </span>
          <span className="hero-caret ml-0.5 inline-block h-4 w-px align-middle" />
        </p>
        {progress > 0.4 ? (
          <p
            className="mt-1 text-xs font-medium text-fuchsia-300/85 transition-opacity duration-300"
            style={{ opacity: Math.min(1, (progress - 0.4) / 0.3) }}
          >
            {line.english}
          </p>
        ) : null}

        <div className="mt-3 h-px overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#7c3aed,#e879f9)] transition-all"
            style={{ width: `${progress * 100}%`, transitionDuration: "60ms" }}
          />
        </div>

        <div className="mt-3 flex gap-4">
          {statLabels.map(([value, label]) => (
            <div key={label}>
              <div className="font-display text-sm font-bold text-white">
                {value}
              </div>
              <div className="text-[10px] text-white/35">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ticker({ locale }: { locale: Locale }) {
  const items = locale === "si" ? SINHALA_TICKER : ENGLISH_TICKER;
  const doubled = [...items, ...items, ...items];

  return (
    <div className="hero-ticker-mask overflow-hidden py-3">
      <div className="flex whitespace-nowrap" style={{ animation: "heroTicker 24s linear infinite" }}>
        {doubled.map(([sinhala, english], index) => (
          <span
            key={`${sinhala}-${english}-${index}`}
            className="flex shrink-0 items-center gap-2.5 pr-8"
          >
            <span
              className="text-sm font-medium text-violet-200"
              style={{ fontFamily: "var(--font-noto-sinhala)" }}
            >
              {sinhala}
            </span>
            <span className="text-xs text-violet-500">.</span>
            <span className="text-xs font-medium text-violet-300/50">
              {english}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function LandingHero({
  locale,
  copy,
  freeCreditsLabel,
}: LandingHeroProps) {
  const statCards =
    locale === "si"
      ? [
          ["99.2%", "නිවැරදිභාවය", "ඉහළම ප්‍රමිතිය"],
          ["0.4s", "ප්‍රමාදය", "සාමාන්‍ය ප්‍රතිචාරය"],
          ["30+", "භාෂා රටා", "සහාය දක්වයි"],
        ]
      : [
          ["99.2%", "Accuracy", "industry best"],
          ["0.4s", "Latency", "avg response"],
          ["30+", "Dialects", "supported"],
        ];

  const mobileStats =
    locale === "si"
      ? [
          ["99.2%", "නිවැරදිභාවය"],
          ["0.4s", "ප්‍රමාදය"],
          ["30+", "භාෂා රටා"],
        ]
      : [
          ["99.2%", "Accuracy"],
          ["0.4s", "Latency"],
          ["30+", "Dialects"],
        ];

  return (
    <section className="hero-noise relative overflow-hidden bg-[linear-gradient(155deg,#07000f_0%,#0d0020_50%,#130030_100%)] text-white">
      <div className="pointer-events-none absolute -right-20 -top-20 h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.2)_0%,transparent_60%)] hero-glow-slow" />
      <div className="pointer-events-none absolute bottom-[-6rem] left-0 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(52,0,117,0.16)_0%,transparent_65%)] hero-glow-delayed" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(124,58,237,.5)_30%,rgba(232,121,249,.4)_70%,transparent)]" />

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col pt-2">
        <div className="flex flex-1 flex-col lg:min-h-[calc(100vh-4rem)] lg:flex-row lg:items-stretch">
          <div className="order-2 flex flex-col justify-center px-6 py-12 sm:px-10 lg:order-1 lg:w-[52%] lg:px-16 lg:py-0 xl:w-[48%] xl:px-24">
            <div
              className="inline-flex self-start rounded-full border border-violet-400/25 bg-violet-500/12 px-3 py-1.5"
              style={{
                animation: "heroFadeUp .55s cubic-bezier(.22,1,.36,1) both",
              }}
            >
              <span className="mr-2 mt-[7px] h-1.5 w-1.5 rounded-full bg-violet-300 hero-glow-fast" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                {copy.badge}
              </span>
            </div>

            <p
              className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-violet-300/90 sm:text-[13px]"
              style={{
                animation: "heroFadeUp .55s cubic-bezier(.22,1,.36,1) .04s both",
              }}
            >
              {copy.eyebrow}
            </p>

            <h1
              className="mb-5 mt-3 font-display text-[clamp(2.4rem,5vw,4.6rem)] font-black leading-[1.04] tracking-tight text-white md:mb-6"
              style={{
                animation: "heroFadeUp .6s cubic-bezier(.22,1,.36,1) .07s both",
              }}
            >
              {copy.heroTitle1}
              <br />
              <span className="inline-flex items-baseline gap-[0.28ch] whitespace-nowrap">
                {locale === "si" ? (
                  <CyclingWord locale={locale} />
                ) : (
                  <>
                    <span>perfectly</span>
                    <CyclingWord locale={locale} />
                  </>
                )}
                <span className="text-white">.</span>
              </span>
            </h1>

            <p
              className="mb-8 max-w-[38ch] text-[clamp(.95rem,1.5vw,1.05rem)] leading-relaxed text-white/55 md:mb-10"
              style={{
                animation: "heroFadeUp .6s cubic-bezier(.22,1,.36,1) .14s both",
              }}
            >
              {copy.heroSubtitle}
            </p>

            <div
              className="mb-8 flex flex-wrap gap-3 md:mb-10"
              style={{
                animation: "heroFadeUp .6s cubic-bezier(.22,1,.36,1) .21s both",
              }}
            >
              <Link
                href={localePath("/signup", locale)}
                className="hero-primary-button inline-flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-bold text-white"
              >
                <Mic className="h-[15px] w-[15px]" />
                <span>{copy.startTranscribing}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={localePath("/pricing", locale)}
                className="inline-flex items-center rounded-2xl border border-white/10 bg-white/6 px-5 py-3.5 text-sm font-semibold text-white/65 transition-colors hover:text-white"
              >
                {copy.viewPricing} <span className="ml-1">→</span>
              </Link>
            </div>

            <div
              className="flex flex-wrap gap-x-6 gap-y-3"
              style={{
                animation: "heroFadeUp .6s cubic-bezier(.22,1,.36,1) .28s both",
              }}
            >
              {[
                freeCreditsLabel,
                copy.noSubscription,
              ].map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-400/20">
                    <Check className="h-2.5 w-2.5 text-violet-300" />
                  </span>
                  <span className="text-xs text-white/45">
                    <span className="font-medium text-white/75">{label}</span>
                  </span>
                </div>
              ))}
            </div>

            <div
              className="mt-10 hidden grid-cols-3 gap-3 lg:grid"
              style={{
                animation: "heroFadeUp .6s cubic-bezier(.22,1,.36,1) .35s both",
              }}
            >
              {statCards.map(([value, label, sublabel]) => (
                <div
                  key={label}
                  className="hero-stat-card rounded-2xl border border-white/8 bg-white/4 p-4"
                >
                  <div className="font-display text-xl font-bold leading-none text-white">
                    {value}
                  </div>
                  <div className="mt-1 text-xs text-white/40">{label}</div>
                  <div className="mt-1.5 text-xs font-medium text-violet-300">
                    {sublabel}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative order-1 lg:order-2 lg:flex-1">
            <div className="relative h-64 w-full overflow-hidden sm:h-80 lg:absolute lg:inset-0 lg:h-full">
              <Image
                src="/images/landing-hero.png"
                alt="Sinhala voice transcriber — recording Sinhala audio for AI-powered speech-to-text transcription"
                fill
                priority
                className="hero-image-fade object-cover object-[30%_center] lg:object-[38%_center]"
                sizes="(min-width: 1024px) 52vw, 100vw"
              />
              <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_bottom,transparent_55%,#07000f_100%)] lg:block" />
              <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,#07000f_0%,transparent_6%)] lg:block" />

              <div
                className="absolute bottom-8 left-8 hidden w-72 lg:block"
                style={{
                  animation: "heroFadeUp .8s cubic-bezier(.22,1,.36,1) .4s both",
                }}
              >
                <LiveCard locale={locale} />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-6 px-5 pb-6 lg:hidden">
          <LiveCard locale={locale} />
        </div>

        <div className="grid grid-cols-3 gap-3 px-5 pb-6 lg:hidden">
          {mobileStats.map(([value, label]) => (
            <div
              key={label}
              className="hero-stat-card rounded-2xl border border-white/8 bg-white/4 p-3 text-center"
            >
              <div className="font-display text-lg font-bold text-white">
                {value}
              </div>
              <div className="mt-1 text-[11px] text-white/40">{label}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/8 px-4 sm:px-6 lg:px-8">
          <Ticker locale={locale} />
        </div>
      </div>
    </section>
  );
}
