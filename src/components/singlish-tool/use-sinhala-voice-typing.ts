"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

// Minimal typing for the Web Speech API (not in TS's DOM lib).
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

export type VoicePlatform = "ios-chrome" | "ios-safari" | "ios-other" | "android" | "desktop";

export function detectVoicePlatform(): VoicePlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) {
    if (/CriOS/.test(ua)) return "ios-chrome";
    if (/FxiOS|EdgiOS|OPiOS/.test(ua)) return "ios-other";
    return "ios-safari";
  }
  return /Android/.test(ua) ? "android" : "desktop";
}

async function micPermissionState(): Promise<string> {
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Free Sinhala voice typing using the browser's built-in speech recognition
 * (si-LK). Costs us nothing — it runs on the browser vendor's service. Works in
 * Chrome and Edge; elsewhere `supported` is false.
 */
export function useSinhalaVoiceTyping({
  onFinal,
  onError,
}: {
  onFinal: (text: string) => void;
  onError: (kind: "denied" | "service" | "other") => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<Recognition | null>(null);
  const session = useRef({ startedAt: 0, segments: 0, chars: 0, errored: false });
  const handlers = useRef({ onFinal, onError });
  handlers.current = { onFinal, onError };

  useEffect(() => {
    const ok = getRecognitionCtor() !== null;
    setSupported(ok);
    if (!ok) trackEvent("voice_typing_unsupported", { platform: detectVoicePlatform() });
    return () => recRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recRef.current) return;
    const rec = new Ctor();
    rec.lang = "si-LK";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let pendingText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript.trim();
        if (r.isFinal) {
          if (t) {
            session.current.segments += 1;
            session.current.chars += t.length;
            handlers.current.onFinal(t);
          }
        } else {
          pendingText += t + " ";
        }
      }
      setInterim(pendingText.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      session.current.errored = true;
      const kind = e.error === "not-allowed" ? "denied" : e.error === "service-not-allowed" ? "service" : "other";
      void micPermissionState().then((permission) =>
        trackEvent("voice_typing_error", { error: e.error, kind, permission, platform: detectVoicePlatform() }),
      );
      handlers.current.onError(kind);
    };
    rec.onend = () => {
      const { startedAt, segments, chars, errored } = session.current;
      if (startedAt && !errored) {
        trackEvent("voice_typing_session", {
          duration_sec: Math.round((Date.now() - startedAt) / 1000),
          segments,
          chars,
          platform: detectVoicePlatform(),
        });
      }
      session.current.startedAt = 0;
      recRef.current = null;
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    session.current = { startedAt: Date.now(), segments: 0, chars: 0, errored: false };
    trackEvent("voice_typing_start", { platform: detectVoicePlatform() });
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
      session.current.startedAt = 0;
      trackEvent("voice_typing_error", { error: "start-failed", kind: "other", platform: detectVoicePlatform() });
      handlers.current.onError("other");
    }
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported, listening, interim, start, stop };
}
