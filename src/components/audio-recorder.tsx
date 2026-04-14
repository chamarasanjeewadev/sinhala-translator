"use client";

import { useState, useRef, useCallback } from "react";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { AIVoiceInput } from "@/components/ui/ai-voice-input";

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

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-full relative min-h-[250px] flex flex-col justify-center">
        <AIVoiceInput
          onStart={startRecording}
          onStop={stopRecording}
          disabled={disabled}
        />
        <div className="text-center mt-2">
          <p className="text-sm text-[#4a4452]">{d.hint}</p>
        </div>
      </div>
    </div>
  );
}
