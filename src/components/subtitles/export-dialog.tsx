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
    <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">{d.exportTitle}</h2>
          <button
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            className="p-1.5 text-ink/55 hover:text-ink transition-colors"
            aria-label={d.cancel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {exporting ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-leaf animate-spin" />
              <p className="text-sm text-ink/85">
                {d.exportingVideo} ({Math.round(progress * 100)}%)
              </p>
            </div>
            <div className="h-2 rounded-full bg-white/60 overflow-hidden">
              <div
                className="h-full bg-ink transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="text-xs text-ink/55">{d.keepTabOpen}</p>
            <button
              onClick={() => abortRef.current?.abort()}
              className="self-start text-sm text-ink/65 hover:text-ink transition-colors"
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
              className="flex items-center gap-3 rounded-xl bg-white/60 hover:bg-white/80 border border-ink/10 p-4 text-left transition-colors"
            >
              <FileText className="w-5 h-5 text-leaf shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink">{d.exportSrt}</p>
                <p className="text-xs text-ink/55">{d.exportSrtDesc}</p>
              </div>
            </button>
            <button
              onClick={() => {
                onExportVtt();
                toast.success(d.exportDone);
              }}
              className="flex items-center gap-3 rounded-xl bg-white/60 hover:bg-white/80 border border-ink/10 p-4 text-left transition-colors"
            >
              <FileText className="w-5 h-5 text-leaf shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink">{d.exportVtt}</p>
                <p className="text-xs text-ink/55">{d.exportVttDesc}</p>
              </div>
            </button>
            {canExportVideo && videoFile ? (
              <button
                onClick={handleExportMp4}
                className="flex items-center gap-3 rounded-xl bg-mint/70 hover:bg-mint/70 border border-leaf/40 p-4 text-left transition-colors"
              >
                <FileVideo className="w-5 h-5 text-leaf shrink-0" />
                <div>
                  <p className="text-sm font-medium text-ink">{d.exportMp4}</p>
                  <p className="text-xs text-ink/55">{d.exportMp4Desc}</p>
                </div>
              </button>
            ) : (
              <p className="text-xs text-ink/55 px-1 pt-1">
                {!videoFile ? d.exportMp4NeedsVideo : d.exportMp4Unsupported}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
