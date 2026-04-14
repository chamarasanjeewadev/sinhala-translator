"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Mic,
  Search,
  FileText,
  Trash2,
  Copy,
  Check,
  X,
  LogOut,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  Eye,
  Pencil,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { LocaleLink } from "@/components/locale-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath } from "@/lib/i18n/utils";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transcription, AnalyzeResponse, ChunkTranscribeResponse, TranslateResponse } from "@/lib/types";
import { AudioRecorder } from "@/components/audio-recorder";
import { AudioUploader } from "@/components/audio-uploader";
import { getAudioDuration, chunkAudio, blobToBase64 } from "@/lib/audio-utils";

interface DashboardContentProps {
  initialCredits: number;
  initialTranscriptions: Transcription[];
}

type TranscribeState =
  | "idle"
  | "analyzing"
  | "ready"
  | "processing"
  | "done"
  | "partial";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDurationFull(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function calcTranslationCredits(text: string): number {
  return Math.max(1, Math.ceil(text.length / 1000));
}

export function DashboardContent({
  initialCredits,
  initialTranscriptions,
}: DashboardContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dict = useDictionary();
  const locale = useLocale();
  const d = dict.dashboard;
  const nav = dict.navbar;
  const supabaseRef = useRef<SupabaseClient | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  const handleSignOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push(localePath("/", locale));
    router.refresh();
  };

  // ── Core data state ──
  const [credits, setCredits] = useState(initialCredits);
  const [transcriptions, setTranscriptions] = useState(initialTranscriptions);

  // ── UI state ──
  const [filter, setFilter] = useState<"all" | "today" | "week">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── View / Edit modal state ──
  const [viewTranscription, setViewTranscription] =
    useState<Transcription | null>(null);
  const [editTranscription, setEditTranscription] =
    useState<Transcription | null>(null);
  const [editText, setEditText] = useState("");
  const [editEnglishText, setEditEnglishText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ── Translation state ──
  const [translateTarget, setTranslateTarget] = useState<Transcription | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  // ── Transcription workspace state ──
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [transcribeState, setTranscribeState] =
    useState<TranscribeState>("idle");
  const [audioSource, setAudioSource] = useState<Blob | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(
    null
  );
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [accumulatedText, setAccumulatedText] = useState("");
  const creditsUsedRef = useRef(0);
  const cancelledRef = useRef(false);

  // ── Payment success ──
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      toast.success(d.paymentSuccess);
      fetchCredits();
    }
  }, [searchParams, d.paymentSuccess]);

  const fetchCredits = useCallback(async () => {
    const res = await fetch("/api/credits");
    if (res.ok) {
      const data: { credits: number } = await res.json();
      setCredits(data.credits);
    }
  }, []);

  const fetchTranscriptions = useCallback(async () => {
    const res = await fetch("/api/transcriptions");
    if (res.ok) {
      const data: { transcriptions: Transcription[] } = await res.json();
      setTranscriptions(data.transcriptions);
    }
  }, []);

  // ── Transcription workspace handlers ──
  const resetState = useCallback(() => {
    setTranscribeState("idle");
    setAudioSource(null);
    setAnalyzeResult(null);
    setCurrentChunk(0);
    setTotalChunks(0);
    setAccumulatedText("");
    creditsUsedRef.current = 0;
    cancelledRef.current = false;
  }, []);

  const handleTranscriptionComplete = useCallback(
    (_text: string, creditsRemaining: number) => {
      setCredits(creditsRemaining);
      fetchTranscriptions();
      resetState();
      toast.success(d.transcriptionComplete);
    },
    [fetchTranscriptions, resetState, d.transcriptionComplete]
  );

  const analyzeAudio = useCallback(
    async (source: Blob) => {
      setAudioSource(source);
      setTranscribeState("analyzing");

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
          setTranscribeState("idle");
          return;
        }

        const result: AnalyzeResponse = await res.json();
        setAnalyzeResult(result);
        setTranscribeState("ready");
      } catch {
        toast.error(d.transcriptionFailed);
        setTranscribeState("idle");
      }
    },
    [d.transcriptionFailed]
  );

  const handleRecordingComplete = useCallback(
    (blob: Blob) => {
      analyzeAudio(blob);
    },
    [analyzeAudio]
  );

  const handleFileSelected = useCallback(
    (file: File) => {
      analyzeAudio(file);
    },
    [analyzeAudio]
  );

  const handleConfirmTranscribe = useCallback(async () => {
    if (!audioSource || !analyzeResult) return;

    setTranscribeState("processing");
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
          isPartial = true;
          toast.error(d.insufficientCredits);
          break;
        }

        if (!res.ok) {
          const data: { error?: string } = await res.json();
          toast.error(data.error || d.transcriptionFailed);
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

        setTranscribeState(isPartial ? "partial" : "done");
        handleTranscriptionComplete(fullText, lastCreditsRemaining);
      } else {
        toast.error(d.transcriptionFailed);
        setTranscribeState("idle");
      }
    } catch {
      toast.error(d.transcriptionFailed);
      setTranscribeState("idle");
    }
  }, [audioSource, analyzeResult, d.insufficientCredits, d.transcriptionFailed, handleTranscriptionComplete]);

  // ── List action handlers ──
  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(d.copied);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (text: string, id: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcription-${id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(d.deleteConfirm)) return;

    const res = await fetch(`/api/transcriptions?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setTranscriptions((prev) => prev.filter((t) => t.id !== id));
      toast.success(d.deleted);
    } else {
      toast.error(d.deleteFailed);
    }
  };

  // ── Edit handlers ──
  const openEdit = (t: Transcription) => {
    setEditTranscription(t);
    setEditText(t.transcription_text);
    setEditEnglishText(t.english_translation ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editTranscription) return;
    setIsSaving(true);

    const body: { text?: string; englishTranslation?: string } = {};
    if (editText !== editTranscription.transcription_text) body.text = editText;
    if (editEnglishText !== (editTranscription.english_translation ?? ""))
      body.englishTranslation = editEnglishText;

    if (Object.keys(body).length === 0) {
      setIsSaving(false);
      setEditTranscription(null);
      return;
    }

    const res = await fetch(`/api/transcriptions?id=${editTranscription.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setIsSaving(false);
    if (res.ok) {
      setTranscriptions((prev) =>
        prev.map((t) =>
          t.id === editTranscription.id
            ? {
                ...t,
                transcription_text: body.text ?? t.transcription_text,
                english_translation:
                  body.englishTranslation !== undefined
                    ? body.englishTranslation
                    : t.english_translation,
              }
            : t
        )
      );
      toast.success(d.saveSuccess);
      setEditTranscription(null);
    } else {
      toast.error(d.saveFailed);
    }
  };

  // ── Translation handler ──
  const handleTranslate = async () => {
    if (!translateTarget) return;
    const target = translateTarget;
    setTranslateTarget(null);
    setTranslatingId(target.id);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptionId: target.id,
          text: target.transcription_text,
        }),
      });

      if (res.status === 402) {
        const data: { error: string; creditsNeeded?: number; creditsAvailable?: number } =
          await res.json();
        toast.error(
          data.error ||
            d.insufficientCreditsForTranslation
              .replace("{needed}", String(data.creditsNeeded ?? "?"))
              .replace("{available}", String(data.creditsAvailable ?? credits))
        );
        return;
      }

      if (!res.ok) {
        toast.error(d.translationFailed);
        return;
      }

      const data: TranslateResponse = await res.json();
      setCredits(data.creditsRemaining);
      setTranscriptions((prev) =>
        prev.map((t) =>
          t.id === target.id
            ? { ...t, english_translation: data.translation }
            : t
        )
      );
      toast.success(d.translationSaved);
    } catch {
      toast.error(d.translationFailed);
    } finally {
      setTranslatingId(null);
    }
  };

  // ── Filtering + grouping ──
  const filteredTranscriptions = transcriptions.filter((t) => {
    if (
      searchQuery &&
      !t.transcription_text.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(t.created_at) >= today;
    } else if (filter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(t.created_at) >= weekAgo;
    }

    return true;
  });

  const groupedTranscriptions = filteredTranscriptions.reduce(
    (acc, t) => {
      const date = new Date(t.created_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;
      if (date >= today) {
        dateKey = d.filterToday;
      } else if (date >= yesterday) {
        dateKey = "Yesterday";
      } else {
        dateKey = date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year:
            date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
        });
      }

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(t);
      return acc;
    },
    {} as Record<string, Transcription[]>
  );

  const noCredits = credits <= 0;
  const flatTranscriptions = Object.entries(groupedTranscriptions);
  const progressPercent =
    totalChunks > 0 ? Math.round((currentChunk / totalChunks) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f0f3ff] text-[#111c2d] pb-16">
      {/* ── Glassmorphic Navbar ── */}
      <header className="glass-panel shadow-ambient sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Left: Brand + Nav */}
          <div className="flex items-center gap-6">
            <LocaleLink href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo.jpeg"
                alt="HelaVoice.lk"
                width={32}
                height={32}
                className="w-8 h-8 rounded-xl object-cover"
              />
              <span className="text-base font-bold hidden sm:block font-display text-[#111c2d]">
                HelaVoice.lk
              </span>
            </LocaleLink>

            <nav className="hidden sm:flex items-center gap-1">
              <LocaleLink
                href="/"
                className="px-3 py-1.5 rounded-full text-sm font-medium text-[#4a4452] hover:text-[#111c2d] hover:bg-[#e7eeff] transition-colors"
              >
                {d.home}
              </LocaleLink>
              <LocaleLink
                href="/blog"
                className="px-3 py-1.5 rounded-full text-sm font-medium text-[#4a4452] hover:text-[#111c2d] hover:bg-[#e7eeff] transition-colors"
              >
                {nav.blog}
              </LocaleLink>
              <LocaleLink
                href="/pricing"
                className="px-3 py-1.5 rounded-full text-sm font-medium text-[#4a4452] hover:text-[#111c2d] hover:bg-[#e7eeff] transition-colors"
              >
                {nav.pricing}
              </LocaleLink>
            </nav>
          </div>

          {/* Right: Credits + Language + Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Credits pill */}
            <div className="bg-[#ffffff] rounded-full px-3 py-1.5 flex items-center gap-2 shadow-[0_10px_30px_rgba(17,28,45,0.06)]">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#340075] to-[#4c1d95] flex items-center justify-center shrink-0">
                <FileText className="w-3 h-3 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] text-[#4a4452]">{d.creditsLabel}</div>
                <div className="text-sm font-bold text-[#111c2d]">{credits}</div>
              </div>
            </div>

            <LocaleLink
              href="/pricing"
              className="hidden sm:inline-flex items-center bg-gradient-to-r from-[#340075] to-[#4c1d95] text-white px-4 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            >
              {d.buyCredits}
            </LocaleLink>

            <div className="[&_button]:text-[#4a4452] [&_button]:hover:text-[#111c2d]">
              <LanguageSwitcher />
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-[#4a4452] hover:text-[#111c2d] hover:bg-[#e7eeff] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{nav.signOut}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero / Transcription Workspace ── */}
      <section className="relative overflow-hidden bg-[#f9f9ff] pt-12 pb-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#340075]/6 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 right-0 w-80 h-80 rounded-full bg-[#4c1d95]/5 blur-3xl"
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          {/* ── Idle ── */}
          {transcribeState === "idle" && (
            <>
              <div className="text-center mb-8">
                <h1 className="font-display text-3xl md:text-4xl font-bold text-[#111c2d] mb-3">
                  {d.transcribeTitle}
                </h1>
                <p className="text-[#4a4452] text-base">{d.transcribeDesc}</p>
              </div>

              <div className="flex gap-2 mb-6 max-w-xs mx-auto">
                <button
                  onClick={() => setMode("record")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-full text-sm font-semibold transition-all ${
                    mode === "record"
                      ? "bg-gradient-to-r from-[#340075] to-[#4c1d95] text-white"
                      : "bg-[#e7eeff] text-[#4a4452] hover:bg-[#d8e3fb]"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  {d.record}
                </button>
                <button
                  onClick={() => setMode("upload")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-full text-sm font-semibold transition-all ${
                    mode === "upload"
                      ? "bg-gradient-to-r from-[#340075] to-[#4c1d95] text-white"
                      : "bg-[#e7eeff] text-[#4a4452] hover:bg-[#d8e3fb]"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  {d.upload}
                </button>
              </div>

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

              {noCredits && (
                <div className="mt-6 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 bg-[#ffdad6] text-[#ba1a1a] rounded-2xl px-5 py-3 text-sm font-medium">
                    <span>{d.outOfCredits}</span>
                    <LocaleLink
                      href="/pricing"
                      className="underline font-semibold hover:opacity-80"
                    >
                      {d.buyCredits}
                    </LocaleLink>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Analyzing ── */}
          {transcribeState === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-[#340075] animate-spin" />
              <p className="text-[#4a4452] text-base font-medium">{d.analyzing}</p>
            </div>
          )}

          {/* ── Ready ── */}
          {transcribeState === "ready" && analyzeResult && (
            <div>
              <div className="text-center mb-6">
                <h1 className="font-display text-3xl md:text-4xl font-bold text-[#111c2d] mb-3">
                  {d.transcribeTitle}
                </h1>
              </div>

              <div className="bg-[#ffffff] rounded-2xl shadow-[0_10px_30px_rgba(17,28,45,0.06)] p-6 space-y-4 max-w-md mx-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[#4a4452] text-sm">{d.audioDuration}</span>
                  <span className="text-[#111c2d] font-mono font-bold text-sm">
                    {formatDurationFull(analyzeResult.durationSeconds)}
                  </span>
                </div>
                <div className="h-px bg-[#f0f3ff]" />
                <div className="flex items-center justify-between">
                  <span className="text-[#4a4452] text-sm">
                    {d.creditsRequired}{" "}
                    <span className="text-xs">({d.perMinute})</span>
                  </span>
                  <span className="text-[#111c2d] font-bold text-sm">
                    {analyzeResult.requiredCredits}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#4a4452] text-sm">{d.creditsAvailable}</span>
                  <span className="text-[#111c2d] font-bold text-sm">
                    {analyzeResult.currentCredits}
                  </span>
                </div>

                {!analyzeResult.canProceed && (
                  <div className="flex items-center gap-2 text-sm bg-[#ffdad6] text-[#ba1a1a] rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {d.insufficientCredits}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 max-w-md mx-auto">
                <button
                  onClick={() => {
                    setTranscribeState("idle");
                    setAudioSource(null);
                    setAnalyzeResult(null);
                  }}
                  className="flex-1 py-3 rounded-full font-semibold bg-[#e7eeff] text-[#4a4452] hover:bg-[#d8e3fb] transition-colors text-sm"
                >
                  {d.cancel}
                </button>
                <button
                  onClick={handleConfirmTranscribe}
                  disabled={!analyzeResult.canProceed}
                  className="flex-1 bg-gradient-to-r from-[#340075] to-[#4c1d95] text-white py-3 rounded-full font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(17,28,45,0.06)]"
                >
                  {d.confirmTranscription}
                </button>
              </div>
            </div>
          )}

          {/* ── Processing ── */}
          {transcribeState === "processing" && (
            <div className="max-w-md mx-auto py-8 space-y-6">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[#4a4452]">
                    {d.processingChunk
                      .replace("{current}", String(currentChunk))
                      .replace("{total}", String(totalChunks))}
                  </span>
                  <span className="text-[#4a4452] font-mono tabular-nums">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full bg-[#e7eeff] rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#340075] to-[#4c1d95] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {accumulatedText && (
                <div className="bg-[#ffffff] rounded-2xl shadow-[0_10px_30px_rgba(17,28,45,0.06)] p-4 max-h-48 overflow-y-auto">
                  <p className="text-sm text-[#111c2d] leading-relaxed sinhala-text">
                    {accumulatedText}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-[#4a4452]">
                <Loader2 className="w-5 h-5 animate-spin text-[#340075]" />
                <span className="text-sm font-medium">{d.transcribing}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Recording List ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-[#111c2d]">
              {d.recordingList}
            </h2>

            <div className="flex gap-1.5">
              {(["all", "today", "week"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filter === f
                      ? "bg-[#340075] text-white"
                      : "bg-[#ffffff] text-[#4a4452] hover:bg-[#e7eeff]"
                  }`}
                >
                  {f === "all"
                    ? d.filterAll
                    : f === "today"
                      ? d.filterToday
                      : d.filterWeek}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showSearch ? (
              <div className="relative flex items-center">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a4452]" />
                <input
                  type="text"
                  autoFocus
                  placeholder={d.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#f0f3ff] focus:bg-[#d8e3fb] rounded-full pl-9 pr-9 py-2 text-sm text-[#111c2d] placeholder:text-[#4a4452] focus:outline-none transition-colors w-48"
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#e7eeff] hover:bg-[#d8e3fb] rounded-full flex items-center justify-center text-[#4a4452] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="w-9 h-9 bg-[#ffffff] hover:bg-[#e7eeff] rounded-full flex items-center justify-center transition-colors shadow-[0_10px_30px_rgba(17,28,45,0.06)]"
              >
                <Search className="w-4 h-4 text-[#4a4452]" />
              </button>
            )}
          </div>
        </div>

        {/* Transcription list */}
        {filteredTranscriptions.length === 0 ? (
          <div className="bg-[#ffffff] rounded-2xl shadow-[0_10px_30px_rgba(17,28,45,0.06)] px-8 py-16 text-center">
            <div className="w-16 h-16 bg-[#e7eeff] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Mic className="w-8 h-8 text-[#340075]" />
            </div>
            <h3 className="font-display text-lg font-bold text-[#111c2d] mb-2">
              {d.noTranscriptions}
            </h3>
            <p className="text-sm text-[#4a4452] max-w-xs mx-auto leading-relaxed">
              {d.noTranscriptionsDesc}
            </p>
          </div>
        ) : (
          <div className="bg-[#ffffff] rounded-2xl shadow-[0_10px_30px_rgba(17,28,45,0.06)] overflow-hidden">
            {flatTranscriptions.map(([date, items], groupIndex) => (
              <div key={date}>
                <div className="px-5 py-2.5 bg-[#f0f3ff]">
                  <span className="text-xs font-semibold text-[#4a4452] uppercase tracking-widest">
                    {date}
                  </span>
                </div>

                {items.map((t, itemIndex) => {
                  const globalIndex =
                    flatTranscriptions
                      .slice(0, groupIndex)
                      .reduce((sum, [, g]) => sum + g.length, 0) + itemIndex;
                  const isEven = globalIndex % 2 === 0;

                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#e7eeff] ${
                        isEven ? "bg-[#ffffff]" : "bg-[#f0f3ff]"
                      }`}
                    >
                      {/* Left: text + metadata */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#111c2d] line-clamp-1 font-medium sinhala-text leading-snug">
                          {t.transcription_text}
                        </p>
                        <p className="text-xs text-[#4a4452] mt-0.5 flex items-center gap-1 flex-wrap">
                          {new Date(t.created_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                          {t.english_translation && (
                            <span className="inline-flex items-center bg-[#d6f5e3] text-[#0d6832] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              EN
                            </span>
                          )}
                          {t.is_partial && (
                            <span className="inline-flex items-center bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              {d.partial}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Center: duration */}
                      <div className="shrink-0 text-xs text-[#4a4452] font-mono tabular-nums w-14 text-center">
                        {formatDuration(t.audio_duration_seconds)}
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setViewTranscription(t)}
                          title={d.view}
                          className="flex items-center gap-1.5 bg-[#e7eeff] hover:bg-[#d8e3fb] text-[#340075] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{d.view}</span>
                        </button>

                        <button
                          onClick={() => openEdit(t)}
                          title={d.edit}
                          className="flex items-center gap-1.5 bg-[#e7eeff] hover:bg-[#d8e3fb] text-[#340075] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{d.edit}</span>
                        </button>

                        {/* Translate button */}
                        {translatingId === t.id ? (
                          <button
                            disabled
                            className="flex items-center gap-1.5 bg-[#e7eeff] text-[#340075] rounded-full px-3 py-1.5 text-xs font-semibold opacity-60 cursor-not-allowed"
                          >
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="hidden sm:inline">{d.translating}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setTranslateTarget(t)}
                            title={t.english_translation ? d.retranslate : d.translate}
                            className="flex items-center gap-1.5 bg-[#e7eeff] hover:bg-[#d8e3fb] text-[#340075] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">
                              {t.english_translation ? d.retranslate : d.translate}
                            </span>
                          </button>
                        )}

                        <button
                          onClick={() => handleCopy(t.transcription_text, t.id)}
                          title={d.copy}
                          className="flex items-center gap-1.5 bg-[#e7eeff] hover:bg-[#d8e3fb] text-[#340075] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                        >
                          {copiedId === t.id ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">{d.copy}</span>
                        </button>

                        <button
                          onClick={() => handleDownload(t.transcription_text, t.id)}
                          title={d.download}
                          className="flex items-center gap-1.5 bg-[#e7eeff] hover:bg-[#d8e3fb] text-[#340075] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{d.download}</span>
                        </button>

                        <button
                          onClick={() => handleDelete(t.id)}
                          title={d.delete}
                          className="flex items-center gap-1.5 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{d.delete}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── View Modal ── */}
      {viewTranscription && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(17,28,45,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setViewTranscription(null)}
        >
          <div
            className="bg-[#ffffff] rounded-3xl shadow-[0_24px_64px_rgba(17,28,45,0.18)] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f3ff]">
              <div>
                <h2 className="font-display text-lg font-bold text-[#111c2d]">
                  {d.viewTitle}
                </h2>
                <p className="text-xs text-[#4a4452] mt-0.5">
                  {new Date(viewTranscription.created_at).toLocaleString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleCopy(viewTranscription.transcription_text, viewTranscription.id)
                  }
                  className="flex items-center gap-1.5 bg-[#e7eeff] hover:bg-[#d8e3fb] text-[#340075] rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                >
                  {copiedId === viewTranscription.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {d.copy}
                </button>
                <button
                  onClick={() => setViewTranscription(null)}
                  className="w-9 h-9 rounded-full bg-[#f0f3ff] hover:bg-[#e7eeff] flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-[#4a4452]" />
                </button>
              </div>
            </div>

            {/* Body — two sections */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Sinhala */}
              <div>
                <h3 className="text-xs font-semibold text-[#4a4452] uppercase tracking-widest mb-3">
                  {d.sinhala}
                </h3>
                <p className="text-[#111c2d] text-base leading-relaxed sinhala-text whitespace-pre-wrap">
                  {viewTranscription.transcription_text}
                </p>
              </div>

              {/* English — only if translated */}
              {viewTranscription.english_translation && (
                <>
                  <div className="h-px bg-[#f0f3ff]" />
                  <div>
                    <h3 className="text-xs font-semibold text-[#4a4452] uppercase tracking-widest mb-3">
                      {d.english}
                    </h3>
                    <p className="text-[#111c2d] text-base leading-relaxed whitespace-pre-wrap">
                      {viewTranscription.english_translation}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[#f0f3ff] flex items-center justify-between">
              <span className="text-xs text-[#4a4452]">
                {d.charCount.replace(
                  "{count}",
                  String(viewTranscription.transcription_text.length)
                )}
              </span>
              {viewTranscription.audio_duration_seconds && (
                <span className="text-xs text-[#4a4452] font-mono">
                  {formatDuration(viewTranscription.audio_duration_seconds)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTranscription && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(17,28,45,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => !isSaving && setEditTranscription(null)}
        >
          <div
            className="bg-[#ffffff] rounded-3xl shadow-[0_24px_64px_rgba(17,28,45,0.18)] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f3ff]">
              <h2 className="font-display text-lg font-bold text-[#111c2d]">
                {d.editTitle}
              </h2>
              <button
                onClick={() => !isSaving && setEditTranscription(null)}
                className="w-9 h-9 rounded-full bg-[#f0f3ff] hover:bg-[#e7eeff] flex items-center justify-center transition-colors"
                disabled={isSaving}
              >
                <X className="w-4 h-4 text-[#4a4452]" />
              </button>
            </div>

            {/* Two-pane editor */}
            <div className="flex flex-col sm:flex-row flex-1 overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[#f0f3ff] min-h-0">
              {/* Sinhala pane */}
              <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
                  <span className="text-xs font-semibold text-[#4a4452] uppercase tracking-widest">
                    {d.sinhala}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#4a4452]">
                      {d.charCount.replace("{count}", String(editText.length))}
                    </span>
                    <button
                      onClick={() => setEditText(editTranscription.transcription_text)}
                      className="text-xs text-[#4a4452] hover:text-[#111c2d] underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden p-3 pt-1">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-full min-h-[220px] resize-none rounded-2xl bg-[#f9f9ff] focus:bg-[#f0f3ff] border-0 outline-none px-4 py-3 text-[#111c2d] text-base leading-relaxed sinhala-text transition-colors"
                    spellCheck={false}
                    autoFocus
                  />
                </div>
              </div>

              {/* English pane */}
              <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
                  <span className="text-xs font-semibold text-[#4a4452] uppercase tracking-widest">
                    {d.english}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#4a4452]">
                      {d.charCount.replace("{count}", String(editEnglishText.length))}
                    </span>
                    {editTranscription.english_translation && (
                      <button
                        onClick={() =>
                          setEditEnglishText(editTranscription.english_translation!)
                        }
                        className="text-xs text-[#4a4452] hover:text-[#111c2d] underline"
                      >
                        {d.resetEnglish}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden p-3 pt-1">
                  {editTranscription.english_translation !== null ? (
                    <textarea
                      value={editEnglishText}
                      onChange={(e) => setEditEnglishText(e.target.value)}
                      className="w-full h-full min-h-[220px] resize-none rounded-2xl bg-[#f9f9ff] focus:bg-[#f0f3ff] border-0 outline-none px-4 py-3 text-[#111c2d] text-base leading-relaxed transition-colors"
                      spellCheck={false}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[220px] text-center text-[#4a4452] text-sm px-6 leading-relaxed">
                      {d.noTranslationYet}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#f0f3ff] flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setEditTranscription(null)}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-full text-sm font-semibold bg-[#e7eeff] text-[#4a4452] hover:bg-[#d8e3fb] transition-colors disabled:opacity-50"
              >
                {d.cancel}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || editText.trim() === ""}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-[#340075] to-[#4c1d95] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {d.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Translate Confirm Modal ── */}
      {translateTarget && (() => {
        const charCount = translateTarget.transcription_text.length;
        const creditsNeeded = calcTranslationCredits(translateTarget.transcription_text);
        const canAfford = credits >= creditsNeeded;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(17,28,45,0.55)", backdropFilter: "blur(4px)" }}
            onClick={() => setTranslateTarget(null)}
          >
            <div
              className="bg-[#ffffff] rounded-3xl shadow-[0_24px_64px_rgba(17,28,45,0.18)] w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f3ff]">
                <h2 className="font-display text-lg font-bold text-[#111c2d]">
                  {d.translateConfirmTitle}
                </h2>
                <button
                  onClick={() => setTranslateTarget(null)}
                  className="w-9 h-9 rounded-full bg-[#f0f3ff] hover:bg-[#e7eeff] flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-[#4a4452]" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-[#4a4452]">
                  {d.translateConfirmBody.replace("{chars}", String(charCount))}
                </p>
                <div className="bg-[#f0f3ff] rounded-2xl px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4a4452]">{d.translateCost}</span>
                    <span className="text-sm font-bold text-[#111c2d]">
                      {creditsNeeded}{" "}
                      {creditsNeeded === 1 ? dict.credits.credit : dict.credits.credits}
                    </span>
                  </div>
                  <div className="h-px bg-[#e7eeff]" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4a4452]">{d.creditsAvailable}</span>
                    <span className="text-sm font-bold text-[#111c2d]">{credits}</span>
                  </div>
                </div>
                {!canAfford && (
                  <div className="flex items-center gap-2 text-sm bg-[#ffdad6] text-[#ba1a1a] rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {d.insufficientCreditsForTranslation
                      .replace("{needed}", String(creditsNeeded))
                      .replace("{available}", String(credits))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#f0f3ff] flex items-center justify-end gap-3">
                <button
                  onClick={() => setTranslateTarget(null)}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold bg-[#e7eeff] text-[#4a4452] hover:bg-[#d8e3fb] transition-colors"
                >
                  {d.cancel}
                </button>
                <button
                  onClick={handleTranslate}
                  disabled={!canAfford}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-[#340075] to-[#4c1d95] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Globe className="w-4 h-4" />
                  {d.translate}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
