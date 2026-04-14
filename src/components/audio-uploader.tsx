"use client";

import { useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
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
        className={`rounded-2xl p-12 text-center transition-all border border-[rgba(204,195,212,0.15)] ${
          dragOver ? "bg-[#e7eeff]" : "bg-[#f0f3ff]"
        } ${
          disabled
            ? "opacity-50 pointer-events-none"
            : "cursor-pointer hover:bg-[#e7eeff]"
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
          <div className="w-16 h-16 bg-gradient-to-br from-[#340075] to-[#4c1d95] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(17,28,45,0.06)]">
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
            <p className="text-sm text-[#111c2d] mb-1 font-medium">
              {d.dragDrop}
            </p>
            <p className="text-xs text-[#4a4452]">
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
        <div className="flex items-center justify-between rounded-xl bg-[#e7eeff] p-4">
          <span className="text-sm text-[#111c2d] font-medium truncate">
            {fileName}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFileName(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="ml-3 shrink-0 text-[#ba1a1a] hover:text-[#93000a] transition-colors"
            aria-label={d.remove}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
