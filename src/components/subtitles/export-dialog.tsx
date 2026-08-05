"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, FileVideo, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { SubtitleSegment, SubtitleStyle } from "@/lib/types";
import { getVideoCapabilities } from "@/lib/video-support";
import { useDictionary } from "@/lib/i18n/dictionary-context";

interface ExportDialogProps {
  videoFile: File | null;
  segments: SubtitleSegment[];
  style: SubtitleStyle;
  title: string;
  onExportSrt: () => void;
  onExportVtt: () => void;
  onClose: () => void;
}

export function ExportDialog({
  videoFile,
  segments,
  style,
  title,
  onExportSrt,
  onExportVtt,
  onClose,
}: ExportDialogProps) {
  const dict = useDictionary();
  const d = dict.subtitles;
  const [canExportVideo, setCanExportVideo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCanExportVideo(getVideoCapabilities().canExportVideo);
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleExportMp4 = async () => {
    if (!videoFile) return;
    setExporting(true);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { exportBurnedInMp4 } = await import("@/lib/video-export");
      const blob = await exportBurnedInMp4(
        videoFile,
        segments,
        style,
        ({ fraction }) => setProgress(fraction),
        controller.signal
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "video"}-subtitled.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(d.exportDone);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.info(d.exportCancelled);
      } else {
        console.error("MP4 export failed:", err);
        toast.error(d.exportFailed);
      }
    } finally {
      setExporting(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{d.exportTitle}</h2>
          <button
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            className="p-1.5 text-white/50 hover:text-white transition-colors"
            aria-label={d.cancel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {exporting ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              <p className="text-sm text-white/80">
                {d.exportingVideo} ({Math.round(progress * 100)}%)
              </p>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="text-xs text-white/40">{d.keepTabOpen}</p>
            <button
              onClick={() => abortRef.current?.abort()}
              className="self-start text-sm text-white/60 hover:text-white transition-colors"
            >
              {d.cancel}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onExportSrt();
                toast.success(d.exportDone);
              }}
              className="flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 p-4 text-left transition-colors"
            >
              <FileText className="w-5 h-5 text-violet-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{d.exportSrt}</p>
                <p className="text-xs text-white/50">{d.exportSrtDesc}</p>
              </div>
            </button>
            <button
              onClick={() => {
                onExportVtt();
                toast.success(d.exportDone);
              }}
              className="flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 p-4 text-left transition-colors"
            >
              <FileText className="w-5 h-5 text-violet-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{d.exportVtt}</p>
                <p className="text-xs text-white/50">{d.exportVttDesc}</p>
              </div>
            </button>
            {canExportVideo && videoFile ? (
              <button
                onClick={handleExportMp4}
                className="flex items-center gap-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 p-4 text-left transition-colors"
              >
                <FileVideo className="w-5 h-5 text-violet-300 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{d.exportMp4}</p>
                  <p className="text-xs text-white/50">{d.exportMp4Desc}</p>
                </div>
              </button>
            ) : (
              <p className="text-xs text-white/40 px-1 pt-1">
                {!videoFile ? d.exportMp4NeedsVideo : d.exportMp4Unsupported}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
