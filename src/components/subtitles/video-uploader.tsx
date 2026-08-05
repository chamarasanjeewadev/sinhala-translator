"use client";

import { useState, useRef, useCallback } from "react";
import { Clapperboard, X } from "lucide-react";
import {
  SUPPORTED_VIDEO_TYPES,
  MAX_VIDEO_SIZE_MB,
  MAX_VIDEO_SIZE_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
} from "@/lib/constants";
import { getVideoDuration } from "@/lib/video-audio";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { t } from "@/lib/i18n/utils";
import { toast } from "sonner";

interface VideoUploaderProps {
  onFileSelected: (file: File, durationSeconds: number) => void;
  disabled?: boolean;
}

export function VideoUploader({ onFileSelected, disabled }: VideoUploaderProps) {
  const dict = useDictionary();
  const d = dict.subtitles;
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) {
        toast.error(d.unsupportedFormat);
        return;
      }
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        toast.error(t(d.tooLarge, { size: MAX_VIDEO_SIZE_MB }));
        return;
      }

      setChecking(true);
      try {
        const duration = await getVideoDuration(file);
        if (!Number.isFinite(duration) || duration <= 0) {
          toast.error(d.unreadableVideo);
          return;
        }
        if (duration > MAX_VIDEO_DURATION_SECONDS) {
          toast.error(
            t(d.tooLong, { minutes: MAX_VIDEO_DURATION_SECONDS / 60 })
          );
          return;
        }
        setFileName(file.name);
        onFileSelected(file, duration);
      } catch {
        toast.error(d.unreadableVideo);
      } finally {
        setChecking(false);
      }
    },
    [onFileSelected, d.unsupportedFormat, d.tooLarge, d.tooLong, d.unreadableVideo]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-2xl p-12 text-center transition-all border border-white/10 ${
          dragOver ? "bg-white/10" : "bg-white/5"
        } ${
          disabled || checking
            ? "opacity-50 pointer-events-none"
            : "cursor-pointer hover:bg-white/10"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#340075] to-[#4c1d95] rounded-full flex items-center justify-center">
            <Clapperboard className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="text-sm text-white mb-1 font-medium">
              {checking ? d.analyzing : d.uploadHint}
            </p>
            <p className="text-xs text-white/50">
              {t(d.uploadFormats, {
                size: MAX_VIDEO_SIZE_MB,
                minutes: MAX_VIDEO_DURATION_SECONDS / 60,
              })}
            </p>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_VIDEO_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        disabled={disabled || checking}
      />

      {fileName && (
        <div className="flex items-center justify-between rounded-xl bg-white/10 p-4">
          <span className="text-sm text-white font-medium truncate">
            {fileName}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFileName(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="ml-3 shrink-0 text-red-400 hover:text-red-300 transition-colors"
            aria-label={d.remove}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
