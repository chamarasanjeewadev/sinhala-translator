"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Check,
  Copy,
  Languages,
  Loader2,
  Mic,
  Square,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSinglishTyping } from "@/components/singlish/use-singlish-typing";
import { SinglishWordPreview } from "@/components/singlish/singlish-word-preview";
import { chunkAudio, blobToBase64 } from "@/lib/audio-utils";
import { apiErrorMessage } from "@/lib/client-error";
import { trackEvent } from "@/lib/analytics";
import { textLimitFor, SPEECH_TEXT_LIMIT } from "@/lib/text-translate";

export type TranslatorDirection = "en-si" | "si-en";

export type TranslatorToolLabels = Record<
  | "english" | "sinhala" | "swap" | "sourcePlaceholderEn" | "sourcePlaceholderSi" | "resultPlaceholder"
  | "translate" | "translating" | "copy" | "copied" | "clear" | "listen" | "listenFailed"
  | "chars" | "limitHint" | "limitHintSignedIn" | "tooLong" | "rateLimited" | "failed" | "serviceBusy"
  | "singlishOn" | "singlishOff" | "previewIdle"
  | "speak" | "stopRecording" | "uploadAudio" | "processingAudio" | "audioHint" | "audioLoginTitle"
  | "audioLoginBody" | "signUp" | "logIn" | "noCredits" | "buyCredits" | "micDenied" | "noSpeech"
  | "audioTooLong" | "heard",
  string
>;

const MAX_AUDIO_SECONDS = 120;

type ApiError = { error?: string; code?: string; limit?: number };
type TextResponse = ApiError & { translation?: string };
type SpeechResponse = ApiError & { audioBase64?: string; audioMimeType?: string };
type AudioResponse = ApiError & {
  translatedText?: string;
  originalText?: string;
  detectedLanguage?: string;
  audioBase64?: string | null;
  audioMimeType?: string | null;
};

type AuthState = "unknown" | "anon" | "signed-in";

function langOf(direction: TranslatorDirection, side: "source" | "target"): "en" | "si" {
  const source = direction === "en-si" ? "en" : "si";
  if (side === "source") return source;
  return source === "en" ? "si" : "en";
}

export function TranslatorTool({
  labels: l,
  initialDirection,
  signupHref,
  loginHref,
  pricingHref,
}: {
  labels: TranslatorToolLabels;
  initialDirection: TranslatorDirection;
  signupHref: string;
  loginHref: string;
  pricingHref: string;
}) {
  const [direction, setDirection] = useState<TranslatorDirection>(initialDirection);
  const [source, setSource] = useState("");
  const [result, setResult] = useState("");
  const [heard, setHeard] = useState("");
  const [busy, setBusy] = useState<"text" | "audio" | null>(null);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState<"source" | "target" | null>(null);
  const [copied, setCopied] = useState(false);
  const [auth, setAuth] = useState<AuthState>("unknown");
  const [audioGate, setAudioGate] = useState<"login" | "credits" | null>(null);
  const [singlishOn, setSinglishOn] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const usedRef = useRef(false);

  const sourceLang = langOf(direction, "source");
  const targetLang = langOf(direction, "target");
  const limit = textLimitFor(auth === "signed-in");
  const overLimit = source.trim().length > limit;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setAuth(data.user ? "signed-in" : "anon"));
  }, []);

  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    audioRef.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const { pending } = useSinglishTyping({
    textareaRef,
    value: source,
    onChange: setSource,
    enabled: sourceLang === "si" && singlishOn,
  });

  const markUsed = (mode: "text" | "audio") => {
    if (usedRef.current) return;
    usedRef.current = true;
    trackEvent("translator_used", { mode, direction });
  };

  const swap = () => {
    setDirection((d) => (d === "en-si" ? "si-en" : "en-si"));
    if (result) {
      setSource(result);
      setResult(source);
    }
    setHeard("");
    trackEvent("translator_swap", {});
  };

  const translate = async () => {
    const text = source.trim();
    if (!text || busy) return;
    if (overLimit) return void toast.error(l.tooLong.replace("{limit}", String(limit)));
    markUsed("text");
    setBusy("text");
    try {
      const res = await fetch("/api/translate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, direction }),
      });
      const data = (await res.json().catch(() => null)) as TextResponse | null;
      if (!res.ok) {
        if (res.status === 429) return void toast.error(l.rateLimited);
        if (data?.code === "TOO_LONG") return void toast.error(l.tooLong.replace("{limit}", String(data.limit ?? limit)));
        return void toast.error(apiErrorMessage(data, { serviceBusy: l.serviceBusy }, l.failed));
      }
      setResult(data?.translation ?? "");
      setHeard("");
      trackEvent("translator_translate", { direction, chars: text.length });
    } catch {
      toast.error(l.failed);
    } finally {
      setBusy(null);
    }
  };

  const playBase64 = (base64: string, mime: string, side: "source" | "target") => {
    audioRef.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const audio = new Audio(`data:${mime};base64,${base64}`);
    audioRef.current = audio;
    setSpeaking(side);
    audio.onended = () => setSpeaking(null);
    audio.onerror = () => setSpeaking(null);
    audio.play().catch(() => setSpeaking(null));
  };

  // Prefer the browser's own voice (free, instant) when it has one for the
  // language — always true for English, rare for Sinhala.
  const speakLocally = (text: string, lang: "en" | "si", side: "source" | "target") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
    if (!voice) return false;
    audioRef.current?.pause();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = () => setSpeaking(null);
    setSpeaking(side);
    window.speechSynthesis.speak(utterance);
    return true;
  };

  const listen = async (side: "source" | "target") => {
    const text = (side === "source" ? source : result).trim();
    if (!text) return;
    if (speaking === side) {
      audioRef.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setSpeaking(null);
      return;
    }
    const lang = side === "source" ? sourceLang : targetLang;
    if (speakLocally(text, lang, side)) {
      trackEvent("translator_listen", { side, lang, engine: "browser" });
      return;
    }
    setSpeaking(side);
    try {
      const res = await fetch("/api/translate-text/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, SPEECH_TEXT_LIMIT), language: lang }),
      });
      const data = (await res.json().catch(() => null)) as SpeechResponse | null;
      if (!res.ok || !data?.audioBase64) {
        setSpeaking(null);
        return void toast.error(res.status === 429 ? l.rateLimited : l.listenFailed);
      }
      playBase64(data.audioBase64, data.audioMimeType ?? "audio/mp3", side);
      trackEvent("translator_listen", { side, lang, engine: "server" });
    } catch {
      setSpeaking(null);
      toast.error(l.listenFailed);
    }
  };

  // Audio: speech → transcript + translation + spoken audio, via the same
  // credit-billed endpoint the mobile interpreter uses. Auto-detects whether
  // English or Sinhala was spoken and translates to the other one.
  const ensureAudioAllowed = () => {
    if (auth !== "signed-in") {
      setAudioGate("login");
      trackEvent("translator_audio_gate", { reason: "login" });
      return false;
    }
    return true;
  };

  const translateAudio = async (blob: Blob) => {
    markUsed("audio");
    setBusy("audio");
    try {
      const chunks = await chunkAudio(blob, MAX_AUDIO_SECONDS);
      if (chunks.length === 0) return void toast.error(l.noSpeech);
      if (chunks.length > 1) toast.info(l.audioTooLong.replace("{seconds}", String(MAX_AUDIO_SECONDS)));
      const audio = await blobToBase64(chunks[0].blob);
      const res = await fetch("/api/realtime-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio, mimeType: "audio/wav", foreignLanguage: "en", withAudio: true }),
      });
      const data = (await res.json().catch(() => null)) as AudioResponse | null;
      if (res.status === 401) return void setAudioGate("login");
      if (res.status === 402) {
        setAudioGate("credits");
        trackEvent("translator_audio_gate", { reason: "credits" });
        return;
      }
      if (!res.ok) {
        if (res.status === 429) return void toast.error(l.rateLimited);
        return void toast.error(apiErrorMessage(data, { serviceBusy: l.serviceBusy }, l.failed));
      }
      if (!data?.translatedText) return void toast.info(l.noSpeech);

      const spokenSinhala = data.detectedLanguage === "si";
      setDirection(spokenSinhala ? "si-en" : "en-si");
      setSource(data.originalText ?? "");
      setHeard(data.originalText ?? "");
      setResult(data.translatedText);
      if (data.audioBase64) playBase64(data.audioBase64, data.audioMimeType ?? "audio/mp3", "target");
      trackEvent("translator_audio", { detected: data.detectedLanguage, seconds: Math.round(chunks[0].durationSec) });
    } catch {
      toast.error(l.failed);
    } finally {
      setBusy(null);
    }
  };

  const startRecording = async () => {
    if (!ensureAudioAllowed() || busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const parts: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && parts.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(parts, { type: recorder.mimeType || "audio/webm" });
        if (blob.size) void translateAudio(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      // Hard stop so a forgotten recording can't run past what one request handles.
      setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_AUDIO_SECONDS * 1000);
    } catch {
      toast.error(l.micDenied);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const onFile = (file: File | undefined) => {
    if (!file || !ensureAudioAllowed() || busy) return;
    void translateAudio(file);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success(l.copied);
      setTimeout(() => setCopied(false), 1800);
      trackEvent("translator_copy", { direction });
    } catch {
      // clipboard blocked
    }
  };

  const clear = () => {
    setSource("");
    setResult("");
    setHeard("");
    textareaRef.current?.focus();
  };

  const langName = (lang: "en" | "si") => (lang === "en" ? l.english : l.sinhala);
  const pill =
    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50";
  const listenButton = (side: "source" | "target", text: string) => (
    <button
      type="button"
      onClick={() => listen(side)}
      disabled={!text.trim()}
      aria-label={l.listen}
      className={`${pill} bg-[#e6efe6] text-[#15201b] hover:bg-[#dbe7dc]`}
    >
      {speaking === side ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      {l.listen}
    </button>
  );

  return (
    <div className="rounded-3xl bg-white text-[#15201b] shadow-[0_24px_64px_rgba(0,0,0,0.35)] overflow-hidden">
      {/* ── Language bar ── */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-[#e6efe6] px-4 py-3">
        <span className="text-sm font-bold text-[#15201b] text-center sm:text-left">{langName(sourceLang)}</span>
        <button
          type="button"
          onClick={swap}
          aria-label={l.swap}
          title={l.swap}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6efe6] text-[#15201b] hover:bg-[#dbe7dc] transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-[#15201b] text-center sm:text-right lg:text-left lg:pl-4">{langName(targetLang)}</span>
      </div>

      <div className="grid lg:grid-cols-2">
        {/* ── Source ── */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-[#e6efe6]">
          {sourceLang === "si" && (
            <button
              type="button"
              role="switch"
              aria-checked={singlishOn}
              onClick={() => {
                setSinglishOn((v) => !v);
                textareaRef.current?.focus();
              }}
              className="mx-4 mt-3 flex items-center gap-2 self-start text-left"
            >
              <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${singlishOn ? "bg-[#15201b]" : "bg-[#cdd6ce]"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${singlishOn ? "left-[18px]" : "left-0.5"}`} />
              </span>
              <span className="text-xs font-semibold">
                <span className="sinhala-text">අ</span> {singlishOn ? l.singlishOn : l.singlishOff}
              </span>
            </button>
          )}
          <label htmlFor="translator-source" className="sr-only">
            {langName(sourceLang)}
          </label>
          <textarea
            id="translator-source"
            ref={textareaRef}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void translate();
            }}
            placeholder={sourceLang === "en" ? l.sourcePlaceholderEn : l.sourcePlaceholderSi}
            lang={sourceLang}
            className="sinhala-text w-full min-h-[220px] sm:min-h-[260px] resize-y bg-transparent border-0 outline-none px-4 py-3.5 text-lg leading-relaxed"
            spellCheck={sourceLang === "en"}
            autoComplete="off"
          />
          {sourceLang === "si" && singlishOn && (
            <SinglishWordPreview pending={pending} idleHint={l.previewIdle} className="border-t border-[#e6efe6] py-1.5" />
          )}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={translate}
              disabled={!source.trim() || busy !== null || overLimit}
              className={`${pill} bg-gradient-to-r from-[#15201b] to-[#2c3a33] text-white hover:opacity-90`}
            >
              {busy === "text" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
              {busy === "text" ? l.translating : l.translate}
            </button>
            {listenButton("source", source)}
            <button type="button" onClick={clear} disabled={!source && !result} className={`${pill} text-[#ba1a1a] hover:bg-[#ffdad6]`}>
              <Trash2 className="w-3.5 h-3.5" />
              {l.clear}
            </button>
            <span className={`ml-auto text-xs ${overLimit ? "text-[#ba1a1a] font-semibold" : "text-[#5b6660]"}`}>
              {l.chars.replace("{count}", String(source.trim().length)).replace("{limit}", String(limit))}
            </span>
          </div>
        </div>

        {/* ── Result ── */}
        <div className="flex flex-col bg-[#f6f8f3]">
          <div
            lang={targetLang}
            aria-live="polite"
            className="sinhala-text min-h-[220px] sm:min-h-[260px] flex-1 px-4 py-3.5 text-lg leading-relaxed whitespace-pre-wrap break-words"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2 text-sm text-[#5b6660]">
                <Loader2 className="w-4 h-4 animate-spin" />
                {busy === "audio" ? l.processingAudio : l.translating}
              </span>
            ) : result ? (
              result
            ) : (
              <span className="text-base text-[#7b7485]">{l.resultPlaceholder}</span>
            )}
          </div>
          {heard && !busy && (
            <p className="px-4 pb-2 text-xs text-[#5b6660]">
              {l.heard} <span className="sinhala-text">“{heard}”</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <button type="button" onClick={copy} disabled={!result} className={`${pill} bg-[#15201b] text-ink hover:opacity-90`}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? l.copied : l.copy}
            </button>
            {listenButton("target", result)}
          </div>
        </div>
      </div>

      {/* ── Audio ── */}
      <div className="border-t border-[#e6efe6] px-4 py-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={busy !== null}
          className={`${pill} ${recording ? "bg-[#ba1a1a] text-ink hover:bg-[#93000a]" : "bg-[#e6efe6] text-[#15201b] hover:bg-[#dbe7dc]"}`}
        >
          {recording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {recording ? l.stopRecording : l.speak}
        </button>
        <button
          type="button"
          onClick={() => (ensureAudioAllowed() ? fileRef.current?.click() : undefined)}
          disabled={busy !== null || recording}
          className={`${pill} bg-[#e6efe6] text-[#15201b] hover:bg-[#dbe7dc]`}
        >
          <Upload className="w-3.5 h-3.5" />
          {l.uploadAudio}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className="text-xs text-[#5b6660] basis-full sm:basis-auto sm:ml-2">{l.audioHint}</span>
        <span className="text-[11px] text-[#7b7485] basis-full sm:basis-auto sm:ml-auto">
          {auth === "signed-in" ? l.limitHintSignedIn : l.limitHint}
        </span>
      </div>

      {audioGate && (
        <div role="alert" className="mx-4 mb-4 rounded-2xl border border-[#15201b]/15 bg-[#eef3ec] p-4 text-sm">
          {audioGate === "login" ? (
            <>
              <p className="font-semibold">{l.audioLoginTitle}</p>
              <p className="mt-1 text-[#5b6660]">{l.audioLoginBody}</p>
              <div className="mt-3 flex gap-2">
                <Link href={signupHref} className={`${pill} bg-[#15201b] text-ink hover:opacity-90`}>
                  {l.signUp}
                </Link>
                <Link href={loginHref} className={`${pill} bg-white text-[#15201b] hover:bg-[#e6efe6]`}>
                  {l.logIn}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold">{l.noCredits}</p>
              <Link href={pricingHref} className={`${pill} mt-3 bg-[#15201b] text-ink hover:opacity-90`}>
                {l.buyCredits}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
