"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Volume2 } from "lucide-react";
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
  | "rateLimited" | "failed" | "serviceBusy",
  string
>;

type Status = { signedIn: boolean; freeCharsLeft: number; credits: number };

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
  const [singlishOn, setSinglishOn] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [gate, setGate] = useState<"login" | "credits" | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);

  const count = text.trim().length;
  const overLimit = count > TTS_MAX_CHARS;
  const charge = status?.signedIn ? ttsCharge(count, TTS_FREE_CHARS - status.freeCharsLeft) : null;

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
      const url = URL.createObjectURL(await res.blob());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setAudioUrl(url);

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
  const pill =
    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50";

  return (
    <div className="rounded-3xl bg-white text-[#111c2d] shadow-[0_24px_64px_rgba(0,0,0,0.35)] overflow-hidden">
      <button
        type="button"
        role="switch"
        aria-checked={singlishOn}
        onClick={() => {
          setSinglishOn((v) => !v);
          textareaRef.current?.focus();
        }}
        className="mx-4 mt-3 flex items-center gap-2 text-left"
      >
        <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${singlishOn ? "bg-[#340075]" : "bg-[#c9c3d3]"}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${singlishOn ? "left-[18px]" : "left-0.5"}`} />
        </span>
        <span className="text-xs font-semibold">
          <span className="sinhala-text">අ</span> {singlishOn ? l.singlishOn : l.singlishOff}
        </span>
      </button>

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
        className="sinhala-text w-full min-h-[200px] sm:min-h-[240px] resize-y bg-transparent border-0 outline-none px-4 py-3.5 text-lg leading-relaxed"
        autoComplete="off"
      />
      {singlishOn && <SinglishWordPreview pending={pending} idleHint={l.previewIdle} className="border-t border-[#e7eeff] py-1.5" />}

      <div className="border-t border-[#e7eeff] px-4 py-3">
        <p id="tts-voice-label" className="mb-2 text-xs font-semibold text-[#4a4452]">
          {l.voice}
        </p>
        <div role="radiogroup" aria-labelledby="tts-voice-label" className="flex flex-wrap gap-2">
          {TTS_VOICES.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={voice === v}
              onClick={() => setVoice(v)}
              className={`${pill} ${voice === v ? "bg-[#340075] text-white" : "bg-[#e7eeff] text-[#340075] hover:bg-[#d8e3fb]"}`}
            >
              {v}
              {voiceStyles[v] && <span className={voice === v ? "text-white/70" : "text-[#340075]/60"}>· {voiceStyles[v]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#e7eeff] px-4 py-3">
        <button
          type="button"
          onClick={generate}
          disabled={!count || busy || overLimit}
          className={`${pill} bg-gradient-to-r from-[#340075] to-[#4c1d95] text-white hover:opacity-90`}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
          {busy ? l.generating : l.generate}
        </button>
        <span className="text-xs text-[#4a4452]">
          {charge && charge.credits > 0 && count > 0 ? l.cost.replace("{credits}", String(charge.credits)) : hint}
        </span>
        <span className={`ml-auto text-xs ${overLimit ? "text-[#ba1a1a] font-semibold" : "text-[#4a4452]"}`}>
          {l.chars.replace("{count}", String(count)).replace("{limit}", String(TTS_MAX_CHARS))}
        </span>
      </div>

      {audioUrl && (
        <div className="border-t border-[#e7eeff] bg-[#f9f9ff] px-4 py-4" aria-live="polite">
          <audio ref={audioRef} src={audioUrl} controls className="w-full" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={audioUrl}
              download="helavoice-sinhala.wav"
              className={`${pill} bg-[#340075] text-white hover:opacity-90`}
            >
              <Download className="w-3.5 h-3.5" />
              {l.download}
            </a>
            <span className="text-xs text-[#4a4452]">{note}</span>
          </div>
        </div>
      )}

      {gate && (
        <div role="alert" className="mx-4 mb-4 mt-2 rounded-2xl border border-[#340075]/15 bg-[#f0f3ff] p-4 text-sm">
          {gate === "login" ? (
            <>
              <p className="font-semibold">{l.loginTitle}</p>
              <p className="mt-1 text-[#4a4452]">{l.loginBody}</p>
              <div className="mt-3 flex gap-2">
                <Link href={signupHref} className={`${pill} bg-[#340075] text-white hover:opacity-90`}>
                  {l.signUp}
                </Link>
                <Link href={loginHref} className={`${pill} bg-white text-[#340075] hover:bg-[#e7eeff]`}>
                  {l.logIn}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold">{l.noCredits}</p>
              <Link href={pricingHref} className={`${pill} mt-3 bg-[#340075] text-white hover:opacity-90`}>
                {l.buyCredits}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
