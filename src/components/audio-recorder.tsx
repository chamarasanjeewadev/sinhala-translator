"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Pause, Play, Square } from "lucide-react";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  disabled?: boolean;
}

type RecorderState = "idle" | "recording" | "paused";

const BAR_COUNT = 48;

export function AudioRecorder({
  onRecordingComplete,
  disabled,
}: AudioRecorderProps) {
  const dict = useDictionary();
  const d = dict.recorder;

  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() =>
    new Array(BAR_COUNT).fill(0)
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopVisualizer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Release every audio resource (mic, analyser, timers, animation frame).
  const teardown = useCallback(() => {
    clearTimer();
    stopVisualizer();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [clearTimer, stopVisualizer]);

  // Clean up on unmount so we never leak the microphone.
  useEffect(() => teardown, [teardown]);

  const runVisualizer = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const step = Math.floor(data.length / BAR_COUNT) || 1;
      const next: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        next.push(data[i * step] / 255); // normalized 0..1
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds((s) => s + 1);
    }, 1000);
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = secondsRef.current;
        teardown();
        setState("idle");
        setLevels(new Array(BAR_COUNT).fill(0));
        setSeconds(0);
        secondsRef.current = 0;
        onRecordingComplete(blob, duration);
      };

      // Real-time waveform from the live mic stream.
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorder.start();
      setSeconds(0);
      secondsRef.current = 0;
      setState("recording");
      startTimer();
      runVisualizer();
    } catch {
      teardown();
      setState("idle");
      alert(d.micError);
    }
  }, [
    disabled,
    state,
    onRecordingComplete,
    teardown,
    startTimer,
    runVisualizer,
    d.micError,
  ]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "recording") return;
    mediaRecorderRef.current.pause();
    clearTimer();
    stopVisualizer();
    setState("paused");
  }, [clearTimer, stopVisualizer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "paused") return;
    mediaRecorderRef.current.resume();
    setState("recording");
    startTimer();
    runVisualizer();
  }, [startTimer, runVisualizer]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // onstop handles teardown + onRecordingComplete
    }
  }, []);

  const formatTime = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const isActive = state === "recording" || state === "paused";

  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[250px] py-4">
      {!isActive ? (
        <>
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            aria-label={d.startRecording}
            className={cn(
              "group relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#340075] to-[#4c1d95] text-white shadow-[0_10px_30px_rgba(52,0,117,0.25)] transition-transform",
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-105 active:scale-95"
            )}
          >
            {!disabled && (
              <span className="absolute inset-0 rounded-full bg-[#340075]/30 animate-ping" />
            )}
            <Mic className="relative w-9 h-9" />
          </button>
          <p className="text-sm text-[#4a4452]">{d.hint}</p>
        </>
      ) : (
        <>
          {/* Live waveform */}
          <div className="flex items-center justify-center gap-0.5 h-16 w-full max-w-md">
            {levels.map((level, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 rounded-full bg-gradient-to-t from-[#340075] to-[#4c1d95] transition-[height,opacity] duration-100",
                  state === "paused" && "opacity-30"
                )}
                style={{
                  height: `${Math.max(6, level * 100)}%`,
                }}
              />
            ))}
          </div>

          {/* Timer */}
          <span
            className={cn(
              "font-mono text-2xl font-semibold text-[#111c2d] tabular-nums",
              state === "paused" && "opacity-50"
            )}
          >
            {formatTime(seconds)}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {state === "recording" ? (
              <button
                type="button"
                onClick={pauseRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e7eeff] text-[#4a4452] font-semibold text-sm hover:bg-[#d8e3fb] transition-colors"
              >
                <Pause className="w-4 h-4" />
                {d.pauseRecording}
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e7eeff] text-[#4a4452] font-semibold text-sm hover:bg-[#d8e3fb] transition-colors"
              >
                <Play className="w-4 h-4" />
                {d.resumeRecording}
              </button>
            )}
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] font-semibold text-sm hover:bg-[#ffc4be] transition-colors"
            >
              <Square className="w-4 h-4 fill-current" />
              {d.stopRecording}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
