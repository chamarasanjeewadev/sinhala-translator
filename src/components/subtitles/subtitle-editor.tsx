"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft, Download, Languages, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { LocaleLink } from "@/components/locale-link";
import { VideoPreview } from "./video-preview";
import { SegmentList } from "./segment-list";
import { Timeline } from "./timeline";
import { StylePanel } from "./style-panel";
import { ExportDialog } from "./export-dialog";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { t } from "@/lib/i18n/utils";
import { takePendingVideo } from "@/lib/pending-video";
import { extractAudioChunks } from "@/lib/video-audio";
import { blobToBase64 } from "@/lib/audio-utils";
import { mergeChunkSegments, segmentsToSrt, segmentsToVtt } from "@/lib/subtitle-format";
import { mergeStyle } from "@/lib/subtitle-style";
import {
  SUBTITLE_CREDITS_PER_MINUTE,
  SUPPORTED_VIDEO_TYPES,
} from "@/lib/constants";
import type {
  SubtitleAnalyzeResponse,
  SubtitleChunkResponse,
  SubtitleProject,
  SubtitleSegment,
  SubtitleStyle,
} from "@/lib/types";

type GenState =
  | "idle"
  | "analyzing"
  | "confirm"
  | "extracting"
  | "generating"
  | "translating";

interface SubtitleEditorProps {
  project: SubtitleProject;
  initialCredits: number;
}

function sortSegments(segments: SubtitleSegment[]): SubtitleSegment[] {
  return [...segments].sort((a, b) => a.start - b.start);
}

export function SubtitleEditor({ project, initialCredits }: SubtitleEditorProps) {
  const dict = useDictionary();
  const d = dict.subtitles;

  const [segments, setSegments] = useState<SubtitleSegment[]>(
    sortSegments(project.segments ?? [])
  );
  const [style, setStyle] = useState<SubtitleStyle>(mergeStyle(project.style));
  const [title, setTitle] = useState(
    project.title ?? project.video_filename.replace(/\.[^.]+$/, "")
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [credits, setCredits] = useState(initialCredits);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [genState, setGenState] = useState<GenState>("idle");
  const [analyzeResult, setAnalyzeResult] =
    useState<SubtitleAnalyzeResponse | null>(null);
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
  const [saving, setSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTranslateConfirm, setShowTranslateConfirm] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const reselectRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const skipNextAutosaveRef = useRef(true);

  const videoUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile]
  );
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // ── Video file intake ────────────────────────────────────────────────

  const analyzeAndMaybeGenerate = useCallback(
    async (file: File) => {
      setVideoFile(file);
      // Resumed project already has subtitles — nothing to generate.
      if (segments.length > 0 || project.credits_used > 0) return;

      setGenState("analyzing");
      try {
        const res = await fetch("/api/subtitles/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationSeconds: project.video_duration_seconds,
          }),
        });
        if (!res.ok) {
          const data: { error?: string } = await res.json();
          toast.error(data.error || d.generationFailed);
          setGenState("idle");
          return;
        }
        const result: SubtitleAnalyzeResponse = await res.json();
        setAnalyzeResult(result);
        setCredits(result.currentCredits);
        setGenState("confirm");
      } catch {
        toast.error(d.generationFailed);
        setGenState("idle");
      }
    },
    [segments.length, project.credits_used, project.video_duration_seconds, d.generationFailed]
  );

  // On mount, pick up the file handed over from the project-list page.
  useEffect(() => {
    const file = takePendingVideo();
    if (file) analyzeAndMaybeGenerate(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReselect = useCallback(
    (file: File) => {
      if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) {
        toast.error(d.unsupportedFormat);
        return;
      }
      if (
        file.name !== project.video_filename ||
        (project.video_size_bytes != null &&
          file.size !== project.video_size_bytes)
      ) {
        toast.warning(d.fileMismatch);
      }
      analyzeAndMaybeGenerate(file);
    },
    [analyzeAndMaybeGenerate, project.video_filename, project.video_size_bytes, d.unsupportedFormat, d.fileMismatch]
  );

  // ── Generation ───────────────────────────────────────────────────────

  const persistProject = useCallback(
    async (updates: {
      segments?: SubtitleSegment[];
      style?: SubtitleStyle;
      title?: string;
      creditsUsed?: number;
      isPartial?: boolean;
    }) => {
      const res = await fetch(`/api/subtitle-projects?id=${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return res.ok;
    },
    [project.id]
  );

  const runGeneration = useCallback(async () => {
    if (!videoFile || !analyzeResult) return;

    cancelledRef.current = false;
    setGenState("extracting");

    try {
      const chunks = await extractAudioChunks(videoFile);
      if (chunks.length === 0) {
        toast.error(d.noAudioTrack);
        setGenState("idle");
        return;
      }

      setGenState("generating");
      setChunkProgress({ current: 0, total: chunks.length });

      const chunkArrays: SubtitleSegment[][] = [];
      let usedCredits = 0;
      let isPartial = false;

      for (let i = 0; i < chunks.length; i++) {
        if (cancelledRef.current) break;
        setChunkProgress({ current: i + 1, total: chunks.length });

        const base64 = await blobToBase64(chunks[i].blob);
        const res = await fetch("/api/subtitles/chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: base64,
            chunkIndex: chunks[i].index,
            totalChunks: chunks.length,
            chunkDurationSec: chunks[i].durationSec,
            language: project.language,
          }),
        });

        if (res.status === 402) {
          isPartial = true;
          toast.error(d.insufficientCredits);
          break;
        }
        if (!res.ok) {
          const data: { error?: string } = await res.json();
          toast.error(data.error || d.generationFailed);
          if (chunkArrays.length > 0) isPartial = true;
          else {
            setGenState("idle");
            return;
          }
          break;
        }

        const data: SubtitleChunkResponse = await res.json();
        chunkArrays.push(data.segments);
        usedCredits +=
          Math.ceil(chunks[i].durationSec / 60) * SUBTITLE_CREDITS_PER_MINUTE;
        setCredits(data.creditsRemaining);
        setSegments(mergeChunkSegments(chunkArrays));
      }

      if (cancelledRef.current && chunkArrays.length === 0) {
        setGenState("idle");
        return;
      }
      if (cancelledRef.current) isPartial = true;

      const finalSegments = mergeChunkSegments(chunkArrays);
      setSegments(finalSegments);
      skipNextAutosaveRef.current = true;
      await persistProject({
        segments: finalSegments,
        creditsUsed: usedCredits,
        isPartial,
      });
      setGenState("idle");
      toast.success(isPartial ? d.generatedPartial : d.generated);
    } catch (err) {
      console.error("Subtitle generation failed:", err);
      toast.error(d.generationFailed);
      setGenState("idle");
    }
  }, [videoFile, analyzeResult, project.language, persistProject, d.noAudioTrack, d.insufficientCredits, d.generationFailed, d.generated, d.generatedPartial]);

  // ── Autosave (debounced) ─────────────────────────────────────────────

  useEffect(() => {
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setSaving(true);
      const ok = await persistProject({ segments, style, title });
      setSaving(false);
      if (!ok) toast.error(d.saveFailed);
    }, 2000);
    return () => clearTimeout(timer);
  }, [segments, style, title, persistProject, d.saveFailed]);

  // ── Segment editing ──────────────────────────────────────────────────

  const seekTo = useCallback((sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
    }
    setCurrentTime(sec);
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      const seg = segments.find((s) => s.id === id);
      if (seg) seekTo(seg.start);
    },
    [segments, seekTo]
  );

  const handleUpdateText = useCallback((id: string, text: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text } : s))
    );
  }, []);

  const handleUpdateTiming = useCallback(
    (id: string, start: number, end: number) => {
      if (end <= start) return;
      setSegments((prev) =>
        sortSegments(
          prev.map((s) => (s.id === id ? { ...s, start, end } : s))
        )
      );
    },
    []
  );

  const handleDelete = useCallback((id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    setSelectedId((sel) => (sel === id ? null : sel));
  }, []);

  const handleAddBelow = useCallback(
    (afterId: string | null) => {
      const duration = project.video_duration_seconds;
      setSegments((prev) => {
        const index =
          afterId === null ? -1 : prev.findIndex((s) => s.id === afterId);
        const prevSeg = index >= 0 ? prev[index] : null;
        const nextSeg = index >= 0 ? prev[index + 1] : prev[0];
        const start = prevSeg ? prevSeg.end : 0;
        const end = Math.min(
          start + 2,
          nextSeg ? nextSeg.start : duration
        );
        if (end - start < 0.3) {
          toast.error(d.noRoomForSegment);
          return prev;
        }
        const newSeg: SubtitleSegment = {
          id: crypto.randomUUID(),
          start,
          end,
          text: "",
        };
        setSelectedId(newSeg.id);
        return sortSegments([...prev, newSeg]);
      });
    },
    [project.video_duration_seconds, d.noRoomForSegment]
  );

  // Keyboard nudge: ←/→ moves the selected segment by 0.1s
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const delta = e.key === "ArrowLeft" ? -0.1 : 0.1;
      setSegments((prev) => {
        const index = prev.findIndex((s) => s.id === selectedId);
        if (index < 0) return prev;
        const seg = prev[index];
        const minStart = index > 0 ? prev[index - 1].end : 0;
        const maxEnd =
          index < prev.length - 1
            ? prev[index + 1].start
            : project.video_duration_seconds;
        const length = seg.end - seg.start;
        let start = Math.round((seg.start + delta) * 10) / 10;
        start = Math.max(minStart, Math.min(start, maxEnd - length));
        return prev.map((s, i) =>
          i === index ? { ...s, start, end: start + length } : s
        );
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, project.video_duration_seconds]);

  // ── Translation (Sinhala ↔ English) ─────────────────────────────────

  const translateCost = Math.max(
    1,
    Math.ceil(segments.reduce((sum, s) => sum + s.text.length, 0) / 1000)
  );

  const runTranslate = useCallback(async () => {
    setShowTranslateConfirm(false);
    setGenState("translating");
    try {
      const res = await fetch("/api/subtitles/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: segments.map((s) => ({ id: s.id, text: s.text })),
          direction: project.language === "en" ? "en-si" : "si-en",
        }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json();
        toast.error(data.error || d.translateFailed);
        return;
      }
      const data: {
        translations: { id: string; text: string }[];
        creditsRemaining: number;
      } = await res.json();
      const byId = new Map(data.translations.map((t) => [t.id, t.text]));
      setSegments((prev) =>
        prev.map((s) => ({ ...s, text: byId.get(s.id) ?? s.text }))
      );
      setCredits(data.creditsRemaining);
      toast.success(d.translated);
    } catch {
      toast.error(d.translateFailed);
    } finally {
      setGenState("idle");
    }
  }, [segments, project.language, d.translateFailed, d.translated]);

  // ── Export ───────────────────────────────────────────────────────────

  const downloadTextFile = useCallback(
    (content: string, extension: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "subtitles"}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [title]
  );

  const handleExportSrt = useCallback(() => {
    downloadTextFile(segmentsToSrt(segments), "srt", "text/plain;charset=utf-8");
  }, [segments, downloadTextFile]);

  const handleExportVtt = useCallback(() => {
    downloadTextFile(segmentsToVtt(segments), "vtt", "text/vtt");
  }, [segments, downloadTextFile]);

  // ── Derived ──────────────────────────────────────────────────────────

  const activeSegment = useMemo(
    () =>
      segments.find((s) => currentTime >= s.start && currentTime < s.end) ??
      null,
    [segments, currentTime]
  );

  // Highlight the playing segment in the list while the video runs
  useEffect(() => {
    if (activeSegment && videoRef.current && !videoRef.current.paused) {
      setSelectedId(activeSegment.id);
    }
  }, [activeSegment]);

  const busy = genState !== "idle" && genState !== "confirm";

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <LocaleLink
            href="/dashboard/subtitles"
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/8 transition-colors"
            aria-label={d.backToProjects}
          >
            <ArrowLeft className="w-5 h-5" />
          </LocaleLink>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-lg font-semibold outline-none border-b border-transparent focus:border-violet-500 min-w-0 flex-1"
            aria-label={d.projectTitle}
          />
          <span className="text-xs text-white/40">
            {saving ? d.saving : ""}
          </span>
          <span className="text-sm text-white/60">
            {t(d.creditsLeft, { credits })}
          </span>
          {segments.length > 0 && (
            <>
              <button
                onClick={() => setShowTranslateConfirm(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white/8 hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                <Languages className="w-4 h-4" />
                {project.language === "en" ? d.translateToSinhala : d.translateToEnglish}
              </button>
              <button
                onClick={() => setShowExport(true)}
                disabled={busy}
                className="hero-primary-button inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {d.export}
              </button>
            </>
          )}
        </div>

        {/* Missing video prompt (resume after reload) */}
        {!videoFile && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center mb-6">
            <p className="text-sm text-white/70 mb-1">{d.reselectPrompt}</p>
            <p className="text-xs text-white/40 mb-4">
              {project.video_filename}
            </p>
            <button
              onClick={() => reselectRef.current?.click()}
              className="hero-primary-button rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            >
              {d.reselectButton}
            </button>
            <input
              ref={reselectRef}
              type="file"
              accept={SUPPORTED_VIDEO_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleReselect(file);
              }}
            />
          </div>
        )}

        {/* Generation progress */}
        {(genState === "extracting" || genState === "generating") && (
          <div className="rounded-2xl bg-violet-500/10 border border-violet-500/30 p-4 mb-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {genState === "extracting"
                  ? d.extracting
                  : t(d.chunkProgress, {
                      current: chunkProgress.current,
                      total: chunkProgress.total,
                    })}
              </p>
              <p className="text-xs text-white/50">{d.keepTabOpen}</p>
            </div>
            <button
              onClick={() => {
                cancelledRef.current = true;
              }}
              className="p-2 text-white/50 hover:text-white transition-colors"
              aria-label={d.cancel}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {genState === "translating" && (
          <div className="rounded-2xl bg-violet-500/10 border border-violet-500/30 p-4 mb-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin shrink-0" />
            <p className="text-sm font-medium">{d.translating}</p>
          </div>
        )}

        {/* Main layout: list | preview+style */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 mb-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 h-[480px]">
            <SegmentList
              segments={segments}
              selectedId={selectedId}
              onSelect={handleSelect}
              onUpdateText={handleUpdateText}
              onUpdateTiming={handleUpdateTiming}
              onDelete={handleDelete}
              onAddBelow={handleAddBelow}
            />
          </div>
          <div className="flex flex-col gap-4">
            {videoUrl ? (
              <VideoPreview
                videoRef={videoRef}
                videoUrl={videoUrl}
                activeText={activeSegment?.text ?? null}
                style={style}
                onTimeUpdate={setCurrentTime}
              />
            ) : (
              <div className="rounded-xl bg-black/40 border border-white/10 h-[280px] flex items-center justify-center text-sm text-white/40">
                {d.noVideoLoaded}
              </div>
            )}
            <StylePanel
              style={style}
              onChange={(updates) => setStyle((s) => ({ ...s, ...updates }))}
            />
          </div>
        </div>

        {/* Timeline */}
        <Timeline
          segments={segments}
          durationSeconds={project.video_duration_seconds}
          currentTime={currentTime}
          selectedId={selectedId}
          onSeek={seekTo}
          onSelect={setSelectedId}
          onUpdateTiming={handleUpdateTiming}
        />
      </div>

      {/* Cost confirmation modal */}
      {genState === "confirm" && analyzeResult && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">{d.confirmTitle}</h2>
            <p className="text-sm text-white/70 mb-1">
              {t(d.confirmCost, {
                credits: analyzeResult.requiredCredits,
                rate: SUBTITLE_CREDITS_PER_MINUTE,
              })}
            </p>
            <p className="text-sm text-white/50 mb-5">
              {t(d.creditsLeft, { credits: analyzeResult.currentCredits })}
            </p>
            {analyzeResult.canProceed ? (
              <div className="flex gap-3">
                <button
                  onClick={runGeneration}
                  className="hero-primary-button flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {d.generateButton}
                </button>
                <button
                  onClick={() => setGenState("idle")}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium bg-white/8 hover:bg-white/15 transition-colors"
                >
                  {d.cancel}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <LocaleLink
                  href="/pricing"
                  className="hero-primary-button flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white text-center"
                >
                  {d.buyCredits}
                </LocaleLink>
                <button
                  onClick={() => setGenState("idle")}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium bg-white/8 hover:bg-white/15 transition-colors"
                >
                  {d.cancel}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Translate confirmation modal */}
      {showTranslateConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">
              {project.language === "en" ? d.translateToSinhala : d.translateToEnglish}
            </h2>
            <p className="text-sm text-white/70 mb-5">
              {t(d.translateCost, { credits: translateCost })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={runTranslate}
                className="hero-primary-button flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              >
                {d.translateButton}
              </button>
              <button
                onClick={() => setShowTranslateConfirm(false)}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium bg-white/8 hover:bg-white/15 transition-colors"
              >
                {d.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export dialog */}
      {showExport && (
        <ExportDialog
          videoFile={videoFile}
          segments={segments}
          style={style}
          title={title}
          onExportSrt={handleExportSrt}
          onExportVtt={handleExportVtt}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
