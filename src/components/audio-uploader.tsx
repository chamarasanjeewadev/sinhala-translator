"use client";

import { useState, useRef, useCallback } from "react";
import { SUPPORTED_AUDIO_TYPES, MAX_AUDIO_SIZE_MB } from "@/lib/constants";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { t } from "@/lib/i18n/utils";

interface AudioUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function AudioUploader({
  onFileSelected,
  disabled,
}: AudioUploaderProps) {
  const dict = useDictionary();
  const d = dict.uploader;
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
        alert(d.unsupportedFormat);
        return;
      }
      if (file.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
        alert(t(d.tooLarge, { size: MAX_AUDIO_SIZE_MB }));
        return;
      }
      setFileName(file.name);
      onFileSelected(file);
    },
    [onFileSelected, d.unsupportedFormat, d.tooLarge]
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
    <div className="flex flex-col gap-4 py-4">
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          dragOver
            ? "border-violet-500 bg-violet-500/10"
            : "border-white/20 bg-white/5"
        } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-white/30 hover:bg-white/10"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/25">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-white mb-1">{d.dragDrop}</p>
            <p className="text-xs text-gray-400">
              {t(d.formats, { size: MAX_AUDIO_SIZE_MB })}
            </p>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_AUDIO_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        disabled={disabled}
      />

      {fileName && (
        <div className="flex items-center justify-between rounded-xl bg-white/10 border border-white/10 p-4">
          <span className="text-sm text-white truncate">{fileName}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFileName(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {d.remove}
          </button>
        </div>
      )}
    </div>
  );
}
