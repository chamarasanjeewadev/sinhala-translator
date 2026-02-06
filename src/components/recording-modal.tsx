"use client";

import { useState, useRef } from "react";
import { X, Mic, Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { AudioRecorder } from "./audio-recorder";
import { AudioUploader } from "./audio-uploader";
import { getAudioDuration, chunkAudio, blobToBase64 } from "@/lib/audio-utils";
import type {
  AnalyzeResponse,
  ChunkTranscribeResponse,
} from "@/lib/types";

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptionComplete: (text: string, creditsRemaining: number) => void;
  credits: number;
}

type ModalState =
  | "idle"
  | "analyzing"
  | "ready"
  | "processing"
  | "done"
  | "partial";

export function RecordingModal({
  isOpen,
  onClose,
  onTranscriptionComplete,
  credits,
}: RecordingModalProps) {
  const dict = useDictionary();
  const d = dict.dashboard;
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [modalState, setModalState] = useState<ModalState>("idle");
  const [audioSource, setAudioSource] = useState<Blob | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(
    null
  );
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [accumulatedText, setAccumulatedText] = useState("");
  const creditsUsedRef = useRef(0);
  const cancelledRef = useRef(false);

  if (!isOpen) return null;

  const resetState = () => {
    setModalState("idle");
    setAudioSource(null);
    setAnalyzeResult(null);
    setCurrentChunk(0);
    setTotalChunks(0);
    setAccumulatedText("");
    creditsUsedRef.current = 0;
    cancelledRef.current = false;
  };

  const handleClose = () => {
    cancelledRef.current = true;
    resetState();
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const analyzeAudio = async (source: Blob) => {
    setAudioSource(source);
    setModalState("analyzing");

    try {
      const duration = await getAudioDuration(source);

      const res = await fetch("/api/transcribe/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds: duration }),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json();
        toast.error(data.error || d.transcriptionFailed);
        setModalState("idle");
        return;
      }

      const result: AnalyzeResponse = await res.json();
      setAnalyzeResult(result);
      setModalState("ready");
    } catch {
      toast.error(d.transcriptionFailed);
      setModalState("idle");
    }
  };

  const handleRecordingComplete = (blob: Blob) => {
    analyzeAudio(blob);
  };

  const handleFileSelected = (file: File) => {
    analyzeAudio(file);
  };

  const handleConfirmTranscribe = async () => {
    if (!audioSource || !analyzeResult) return;

    setModalState("processing");
    cancelledRef.current = false;

    try {
      const chunks = await chunkAudio(audioSource);
      setTotalChunks(chunks.length);

      let fullText = "";
      let usedCredits = 0;
      let lastCreditsRemaining = analyzeResult.currentCredits;
      let isPartial = false;

      for (let i = 0; i < chunks.length; i++) {
        if (cancelledRef.current) return;

        setCurrentChunk(i + 1);

        const base64 = await blobToBase64(chunks[i].blob);

        const res = await fetch("/api/transcribe/chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: base64,
            chunkIndex: i,
            totalChunks: chunks.length,
          }),
        });

        if (res.status === 402) {
          // Out of credits — save partial
          isPartial = true;
          toast.error(d.insufficientCredits);
          break;
        }

        if (!res.ok) {
          const data: { error?: string } = await res.json();
          toast.error(data.error || d.transcriptionFailed);
          // Still save what we have so far
          if (fullText) {
            isPartial = true;
          }
          break;
        }

        const data: ChunkTranscribeResponse = await res.json();
        fullText += (fullText && data.text ? " " : "") + data.text;
        usedCredits++;
        lastCreditsRemaining = data.creditsRemaining;
        setAccumulatedText(fullText);
        creditsUsedRef.current = usedCredits;
      }

      if (cancelledRef.current) return;

      // Save the transcript
      if (fullText) {
        await fetch("/api/transcribe/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: fullText,
            durationSeconds: analyzeResult.durationSeconds,
            creditsUsed: usedCredits,
            isPartial,
          }),
        });

        setModalState(isPartial ? "partial" : "done");
        onTranscriptionComplete(fullText, lastCreditsRemaining);
      } else {
        toast.error(d.transcriptionFailed);
        setModalState("idle");
      }
    } catch {
      toast.error(d.transcriptionFailed);
      setModalState("idle");
    }
  };

  const noCredits = credits <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl w-full max-w-2xl mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {d.transcribeTitle}
            </h2>
            <p className="text-sm text-gray-400 mt-1">{d.transcribeDesc}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Confirmation State */}
        {modalState === "ready" && analyzeResult && (
          <div className="p-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{d.audioDuration}</span>
                <span className="text-white font-mono font-bold">
                  {formatDuration(analyzeResult.durationSeconds)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">
                  {d.creditsRequired} ({d.perMinute})
                </span>
                <span className="text-white font-bold">
                  {analyzeResult.requiredCredits}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{d.creditsAvailable}</span>
                <span className="text-white font-bold">
                  {analyzeResult.currentCredits}
                </span>
              </div>

              {!analyzeResult.canProceed && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {d.insufficientCredits}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setModalState("idle");
                  setAudioSource(null);
                  setAnalyzeResult(null);
                }}
                className="flex-1 py-4 rounded-xl font-bold bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
              >
                {d.cancel}
              </button>
              <button
                onClick={handleConfirmTranscribe}
                disabled={!analyzeResult.canProceed}
                className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-violet-500/25"
              >
                {d.confirmTranscription}
              </button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {modalState === "processing" && (
          <div className="p-6">
            <div className="space-y-6">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">
                    {d.processingChunk
                      .replace("{current}", String(currentChunk))
                      .replace("{total}", String(totalChunks))}
                  </span>
                  <span className="text-gray-400">
                    {totalChunks > 0
                      ? Math.round((currentChunk / totalChunks) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${totalChunks > 0 ? (currentChunk / totalChunks) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Accumulated transcript preview */}
              {accumulatedText && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-h-48 overflow-y-auto">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {accumulatedText}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{d.transcribing}</span>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing State */}
        {modalState === "analyzing" && (
          <div className="p-6">
            <div className="flex items-center justify-center gap-2 text-gray-400 py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{d.analyzing}</span>
            </div>
          </div>
        )}

        {/* Idle State — Mode tabs + recorder/uploader */}
        {modalState === "idle" && (
          <>
            {/* Mode Tabs */}
            <div className="flex gap-2 p-6 pb-4">
              <button
                onClick={() => setMode("record")}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  mode === "record"
                    ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <Mic className="w-4 h-4" />
                {d.record}
              </button>
              <button
                onClick={() => setMode("upload")}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  mode === "upload"
                    ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <Upload className="w-4 h-4" />
                {d.upload}
              </button>
            </div>

            {/* Content */}
            <div className="p-6 pt-2">
              {mode === "record" ? (
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  disabled={noCredits}
                />
              ) : (
                <AudioUploader
                  onFileSelected={handleFileSelected}
                  disabled={noCredits}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
