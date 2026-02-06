"use client";

import { useState, useRef, useCallback } from "react";
import { useDictionary } from "@/lib/i18n/dictionary-context";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  disabled?: boolean;
}

export function AudioRecorder({
  onRecordingComplete,
  disabled,
}: AudioRecorderProps) {
  const dict = useDictionary();
  const d = dict.recorder;
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob, secondsRef.current);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSeconds(0);
      secondsRef.current = 0;

      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert(d.micError);
    }
  }, [onRecordingComplete, d.micError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {isRecording ? (
        <>
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl">
              <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-white mb-1">
              {formatTime(seconds)}
            </div>
            <p className="text-sm text-gray-400">{d.hint}</p>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-400">{d.hint}</p>
        </div>
      )}

      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className={`w-full py-4 px-6 rounded-xl font-bold transition-all shadow-lg ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/25 hover:shadow-red-500/40"
            : "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-violet-500/25 hover:shadow-violet-500/40"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isRecording ? d.stopRecording : d.startRecording}
      </button>
    </div>
  );
}
