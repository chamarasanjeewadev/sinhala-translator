"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, Loader2, Pause, Play, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useSinglishTyping } from "@/components/singlish/use-singlish-typing";
import { SinglishWordPreview } from "@/components/singlish/singlish-word-preview";
import { apiErrorMessage } from "@/lib/client-error";
import { trackEvent } from "@/lib/analytics";
import {
  DEFAULT_TTS_VOICE,
  TTS_FREE_CHARS,
  TTS_MAX_CHARS,
  TTS_VOICES,
  ttsCharge,
  type TtsVoice,
} from "@/lib/text-to-speech";

export type TtsToolLabels = Record<
  | "placeholder" | "singlishOn" | "singlishOff" | "previewIdle" | "voice" | "generate" | "generating"
  | "download" | "chars" | "hintAnon" | "hintFree" | "hintPaid" | "cost" | "resultFree" | "resultCharged"
  | "loginTitle" | "loginBody" | "signUp" | "logIn" | "noCredits" | "buyCredits" | "tooLong"
  | "rateLimited" | "failed" | "serviceBusy"
  | "tryExample" | "voiceHint" | "previewVoice" | "stopPreview" | "play" | "pause" | "seek",
  string
>;

type Status = { signedIn: boolean; freeCharsLeft: number; credits: number };

// One colour pair per voice so each one is recognisable at a glance.
const VOICE_HUE: Record<TtsVoice, [string, string]> = {
  Kore: ["#2f7d5b", "#7cc3dd"],
  Aoede: ["#0284c7", "#67e8f9"],
  Leda: ["#db2777", "#ffd8c2"],
  Sulafat: ["#d97706", "#fcd34d"],
  Puck: ["#059669", "#6ee7b7"],
  Charon: ["#4338ca", "#a5b4fc"],
  Orus: ["#dc2626", "#fca5a5"],
  Achird: ["#0d9488", "#5eead4"],
};

// Shown on an empty editor so a first-time visitor can hear something in two clicks.
const EXAMPLES = [
  "ආයුබෝවන්! හෙළවොයිස් වෙත සාදරයෙන් පිළිගනිමු.",
  "සුබ උදෑසනක්! අද දවස ඔබට සුබදායක වේවා.",
  "ශ්‍රී ලංකාව ඉන්දියන් සාගරයේ පිහිටි අලංකාර දිවයිනකි.",
];

const BARS = 56;
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7cc3dd]";

// Loudness of BARS equal slices of the clip, 0–1, so the player can draw the real waveform.
async function waveformOf(blob: Blob): Promise<number[] | null> {
  try {
    const ctx = new AudioContext();
    const ch = (await ctx.decodeAudioData(await blob.arrayBuffer())).getChannelData(0);
    void ctx.close();
    const step = Math.max(1, Math.floor(ch.length / BARS));
    const peaks = Array.from({ length: BARS }, (_, i) => {
      let m = 0;
      for (let j = i * step; j < (i + 1) * step && j < ch.length; j++) m = Math.max(m, Math.abs(ch[j]));
      return m;
    });
    const top = Math.max(...peaks) || 1;
    return peaks.map((p) => p / top);
  } catch {
    return null; // player falls back to flat bars
  }
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function TtsTool({
  labels: l,
  voiceStyles,
  signupHref,
  loginHref,
  pricingHref,
}: {
  labels: TtsToolLabels;
  voiceStyles: Record<string, string>;
  signupHref: string;
  loginHref: string;
  pricingHref: string;
}) {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<TtsVoice>(DEFAULT_TTS_VOICE);
  const [previewing, setPreviewing] = useState<TtsVoice | null>(null);
  const [singlishOn, setSinglishOn] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const [note, setNote] = useState("");
  const [gate, setGate] = useState<"login" | "credits" | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sampleRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);

  const count = text.trim().length;
  const overLimit = count > TTS_MAX_CHARS;
  const charge = status?.signedIn ? ttsCharge(count, TTS_FREE_CHARS - status.freeCharsLeft) : null;
  const progress = time.dur ? time.cur / time.dur : 0;

  const { pending } = useSinglishTyping({ textareaRef, value: text, onChange: setText, enabled: singlishOn });

  // Allowance + balance (also tells us whether the visitor is signed in).
  useEffect(() => {
    fetch("/api/text-to-speech")
      .then((r) => (r.ok ? (r.json() as Promise<Status>) : null))
      .then((s) => s && setStatus(s))
      .catch(() => {});
  }, []);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  // Start playback as soon as a new clip lands; browsers may refuse, the player is still there.
  useEffect(() => {
    audioRef.current?.play().catch(() => {});
  }, [audioUrl]);

  // Voice samples are static files (public/tts-samples), so previewing costs nothing.
  const togglePreview = (v: TtsVoice) => {
    const a = sampleRef.current;
    if (!a) return;
    if (previewing === v) {
      a.pause();
      return setPreviewing(null);
    }
    audioRef.current?.pause();
    a.src = `/tts-samples/${v}.mp3`;
    setPreviewing(v);
    a.play().catch(() => setPreviewing(null));
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (a) void (a.paused ? a.play().catch(() => {}) : a.pause());
  };

  const seekTo = (fraction: number) => {
    const a = audioRef.current;
    if (a && Number.isFinite(a.duration)) a.currentTime = Math.min(1, Math.max(0, fraction)) * a.duration;
  };

  const generate = async () => {
    const t = text.trim();
    if (!t || busy) return;
    if (status && !status.signedIn) return void setGate("login");
    if (overLimit) return void toast.error(l.tooLong.replace("{limit}", String(TTS_MAX_CHARS)));
    setBusy(true);
    setGate(null);
    try {
      const res = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, voice }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
        if (res.status === 401) return void setGate("login");
        if (res.status === 402) {
          trackEvent("tts_gate", { reason: "credits" });
          return void setGate("credits");
        }
        if (res.status === 429) return void toast.error(l.rateLimited);
        if (data?.code === "TOO_LONG") return void toast.error(l.tooLong.replace("{limit}", String(TTS_MAX_CHARS)));
        return void toast.error(apiErrorMessage(data, { serviceBusy: l.serviceBusy }, l.failed));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      sampleRef.current?.pause();
      setPreviewing(null);
      setPeaks(null);
      setTime({ cur: 0, dur: 0 });
      setAudioUrl(url);
      void waveformOf(blob).then(setPeaks);

      const charged = Number(res.headers.get("X-Tts-Credits-Charged") ?? 0);
      const credits = Number(res.headers.get("X-Credits-Remaining") ?? 0);
      setStatus({ signedIn: true, freeCharsLeft: Number(res.headers.get("X-Tts-Free-Chars-Left") ?? 0), credits });
      setNote(
        charged > 0
          ? l.resultCharged.replace("{credits}", String(charged)).replace("{left}", String(credits))
          : l.resultFree
      );
      trackEvent("tts_generated", { chars: t.length, voice, credits: charged });
    } catch {
      toast.error(l.failed);
    } finally {
      setBusy(false);
    }
  };

  const hint = !status
    ? ""
    : !status.signedIn
      ? l.hintAnon
      : status.freeCharsLeft > 0
        ? l.hintFree.replace("{count}", String(status.freeCharsLeft))
        : l.hintPaid.replace("{credits}", String(status.credits));
  const pill = `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${focus}`;

  return (
    <div className="relative">
      {/* soft violet glow so the card lifts off the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-10 bottom-0 -z-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_30%,rgba(143,208,176,0.32),transparent_70%)] blur-2xl"
      />
      <div className="relative rounded-[28px] bg-white/50 p-2 text-ink shadow-[0_30px_80px_rgba(21,32,27,0.10)] ring-1 ring-white/80 backdrop-blur-xl sm:p-3">
        {/* writing paper */}
        <div className="overflow-hidden rounded-[20px] bg-white text-ink">
          <div className="flex items-center gap-3 px-4 pt-3.5">
            <button
              type="button"
              role="switch"
              aria-checked={singlishOn}
              onClick={() => {
                setSinglishOn((v) => !v);
                textareaRef.current?.focus();
              }}
              className={`flex items-center gap-2 rounded-full text-left ${focus}`}
            >
              <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${singlishOn ? "bg-[#2c3a33]" : "bg-[#cdd6ce]"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${singlishOn ? "left-[18px]" : "left-0.5"}`} />
              </span>
              <span className="text-xs font-semibold">
                <span className="sinhala-text">අ</span> {singlishOn ? l.singlishOn : l.singlishOff}
              </span>
            </button>
            <span className={`ml-auto text-xs tabular-nums ${overLimit ? "font-semibold text-[#ba1a1a]" : "text-[#6b6478]"}`}>
              {l.chars.replace("{count}", String(count)).replace("{limit}", String(TTS_MAX_CHARS))}
            </span>
          </div>

          <label htmlFor="tts-text" className="sr-only">
            {l.placeholder}
          </label>
          <textarea
            id="tts-text"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void generate();
            }}
            placeholder={l.placeholder}
            lang="si"
            className="sinhala-text min-h-[180px] w-full resize-y border-0 bg-transparent px-4 py-3 text-xl leading-relaxed outline-none placeholder:text-[#b3aac4] sm:min-h-[220px]"
            autoComplete="off"
          />

          {count === 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <span className="text-xs font-semibold text-[#6b6478]">{l.tryExample}</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setText(ex);
                    textareaRef.current?.focus();
                  }}
                  className={`sinhala-text max-w-full truncate rounded-full bg-mint/50 px-3.5 py-1 text-sm text-[#2c3a33] transition-colors hover:bg-mint ${focus}`}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {singlishOn && <SinglishWordPreview pending={pending} idleHint={l.previewIdle} className="border-t border-[#e6efe6] py-1.5" />}
          <div className="h-1 bg-[#e6efe6]" aria-hidden>
            <div
              className={`h-full transition-[width] duration-200 ${overLimit ? "bg-[#ba1a1a]" : "bg-gradient-to-r from-[#2f7d5b] to-[#f4b08f]"}`}
              style={{ width: `${Math.min(100, (count / TTS_MAX_CHARS) * 100)}%` }}
            />
          </div>
        </div>

        {/* voice booth */}
        <div className="px-2 pb-1 pt-5 sm:px-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p id="tts-voice-label" className="text-sm font-semibold">
              {l.voice}
            </p>
            <p className="text-xs text-ink/55">{l.voiceHint}</p>
          </div>
          <div role="radiogroup" aria-labelledby="tts-voice-label" className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {TTS_VOICES.map((v) => {
              const on = voice === v;
              const live = previewing === v;
              const [from, to] = VOICE_HUE[v];
              return (
                <div
                  key={v}
                  className={`relative rounded-2xl transition-all ${
                    on
                      ? "bg-white/60 ring-2 ring-[#7cc3dd] shadow-[0_0_28px_rgba(192,132,252,0.25)]"
                      : "bg-white/60 ring-1 ring-ink/10 hover:bg-white/80"
                  }`}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setVoice(v)}
                    className={`flex w-full items-center rounded-2xl py-3 pl-[3.75rem] pr-3 text-left ${focus}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{v}</span>
                      <span className="block truncate text-xs text-ink/60">{voiceStyles[v]}</span>
                    </span>
                    {on && <Check className="ml-1 h-4 w-4 shrink-0 text-[#e0b9ff]" aria-hidden />}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePreview(v)}
                    aria-label={live ? l.stopPreview : l.previewVoice.replace("{voice}", v)}
                    aria-pressed={live}
                    className={`absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-ink shadow-lg transition-transform hover:scale-105 ${focus} ${live ? "ring-4 ring-ink/10" : ""}`}
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  >
                    {live ? (
                      <span className="flex h-4 items-end gap-[3px]" aria-hidden>
                        {[0, 0.25, 0.1].map((d) => (
                          <span key={d} className="hero-wave-bar block h-full w-[3px] rounded-full !bg-white" style={{ animationDelay: `${d}s` }} />
                        ))}
                      </span>
                    ) : (
                      <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <audio ref={sampleRef} preload="none" onEnded={() => setPreviewing(null)} onError={() => setPreviewing(null)} className="hidden" />
        </div>

        {/* generate */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-2 pb-2 pt-5 sm:px-3">
          <button
            type="button"
            onClick={generate}
            disabled={!count || busy || overLimit}
            className={`hero-primary-button inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold text-white disabled:pointer-events-none disabled:opacity-40 disabled:before:hidden ${focus}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            {busy ? l.generating : l.generate}
          </button>
          <span className="min-w-[12rem] flex-1 text-xs leading-relaxed text-ink/65">
            {charge && charge.credits > 0 && count > 0 ? l.cost.replace("{credits}", String(charge.credits)) : hint}
          </span>
        </div>

        {audioUrl && (
          <div className="mx-2 mb-2 mt-3 rounded-2xl bg-white/60 p-4 ring-1 ring-ink/10 sm:mx-3" aria-live="polite">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? l.pause : l.play}
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#15201b] to-[#2c3a33] text-white shadow-[0_6px_20px_rgba(143,208,176,0.5)] transition-transform hover:scale-105 ${focus}`}
              >
                {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
              </button>
              <div
                role="slider"
                tabIndex={0}
                aria-label={l.seek}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  seekTo((e.clientX - r.left) / r.width);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") seekTo(progress + 2 / (time.dur || 1));
                  if (e.key === "ArrowLeft") seekTo(progress - 2 / (time.dur || 1));
                }}
                className={`flex h-12 min-w-0 flex-1 cursor-pointer items-center gap-[2px] overflow-hidden rounded-lg sm:gap-[3px] ${focus}`}
              >
                {(peaks ?? Array.from({ length: BARS }, () => 0.12)).map((p, i) => (
                  <span
                    key={i}
                    className={`min-w-px flex-1 rounded-full transition-colors ${i / BARS < progress ? "bg-[#f4b08f]" : "bg-white/60"}`}
                    style={{ height: `${12 + p * 88}%` }}
                  />
                ))}
              </div>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => {
                setPlaying(true);
                sampleRef.current?.pause();
                setPreviewing(null);
              }}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onTimeUpdate={(e) => setTime({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration || 0 })}
              onLoadedMetadata={(e) => setTime({ cur: 0, dur: e.currentTarget.duration || 0 })}
              className="hidden"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={audioUrl} download="helavoice-sinhala.wav" className={`${pill} bg-white/60 text-ink hover:bg-white/80`}>
                <Download className="h-3.5 w-3.5" />
                {l.download}
              </a>
              <span className="text-xs text-ink/65">{note}</span>
              <span className="ml-auto text-xs tabular-nums text-ink/65">
                {clock(time.cur)} / {clock(time.dur)}
              </span>
            </div>
          </div>
        )}

        {gate && (
          <div role="alert" className="mx-2 mb-2 mt-3 rounded-2xl border border-leaf/25 bg-mint/70 p-4 text-sm sm:mx-3">
            {gate === "login" ? (
              <>
                <p className="font-semibold">{l.loginTitle}</p>
                <p className="mt-1 text-ink/70">{l.loginBody}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={signupHref} className={`${pill} hero-primary-button text-white`}>
                    {l.signUp}
                  </Link>
                  <Link href={loginHref} className={`${pill} bg-white/60 text-ink hover:bg-white/80`}>
                    {l.logIn}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="font-semibold">{l.noCredits}</p>
                <Link href={pricingHref} className={`${pill} hero-primary-button mt-3 text-white`}>
                  {l.buyCredits}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
