"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { SubtitleSegment } from "@/lib/types";
import { formatTimecode, parseTimecode } from "@/lib/subtitle-format";
import { useDictionary } from "@/lib/i18n/dictionary-context";

interface SegmentListProps {
  segments: SubtitleSegment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateTiming: (id: string, start: number, end: number) => void;
  onDelete: (id: string) => void;
  onAddBelow: (id: string | null) => void;
}

function TimecodeInput({
  value,
  onCommit,
  label,
}: {
  value: number;
  onCommit: (seconds: number) => void;
  label: string;
}) {
  const [draft, setDraft] = useState(() => formatTimecode(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(formatTimecode(value));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = parseTimecode(draft);
    if (parsed !== null && parsed !== value) {
      onCommit(parsed);
    } else {
      setDraft(formatTimecode(value));
    }
  };

  return (
    <input
      value={draft}
      aria-label={label}
      onFocus={() => setEditing(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(formatTimecode(value));
          setEditing(false);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-[84px] bg-transparent text-xs text-white/60 font-mono border border-transparent hover:border-white/15 focus:border-violet-500 focus:text-white rounded px-1 py-0.5 outline-none transition-colors"
    />
  );
}

export function SegmentList({
  segments,
  selectedId,
  onSelect,
  onUpdateText,
  onUpdateTiming,
  onDelete,
  onAddBelow,
}: SegmentListProps) {
  const dict = useDictionary();
  const d = dict.subtitles;
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the selected (usually: currently playing) segment in view
  useEffect(() => {
    if (!selectedId || !containerRef.current) return;
    const row = containerRef.current.querySelector(
      `[data-segment-id="${selectedId}"]`
    );
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <p className="text-sm text-white/50">{d.noSegments}</p>
        <button
          onClick={() => onAddBelow(null)}
          className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {d.addSegment}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-y-auto h-full pr-1">
      {segments.map((seg, i) => (
        <div
          key={seg.id}
          data-segment-id={seg.id}
          onClick={() => onSelect(seg.id)}
          className={`group rounded-xl p-3 mb-2 border transition-colors cursor-pointer ${
            seg.id === selectedId
              ? "bg-violet-500/15 border-violet-500/50"
              : "bg-white/5 border-transparent hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-white/35 font-mono w-6 shrink-0">
              {i + 1}
            </span>
            <TimecodeInput
              value={seg.start}
              label={d.startTime}
              onCommit={(sec) => onUpdateTiming(seg.id, sec, seg.end)}
            />
            <span className="text-white/30 text-xs">→</span>
            <TimecodeInput
              value={seg.end}
              label={d.endTime}
              onCommit={(sec) => onUpdateTiming(seg.id, seg.start, sec)}
            />
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddBelow(seg.id);
                }}
                className="p-1 text-white/40 hover:text-white transition-colors"
                aria-label={d.addSegment}
                title={d.addSegment}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(seg.id);
                }}
                className="p-1 text-white/40 hover:text-red-400 transition-colors"
                aria-label={d.deleteSegment}
                title={d.deleteSegment}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={seg.text}
            rows={seg.text.includes("\n") ? 2 : 1}
            onClick={(e) => e.stopPropagation()}
            onFocus={() => onSelect(seg.id)}
            onChange={(e) => onUpdateText(seg.id, e.target.value)}
            className="w-full bg-transparent text-sm text-white resize-none outline-none placeholder:text-white/30"
            placeholder={d.segmentPlaceholder}
          />
        </div>
      ))}
      <button
        onClick={() => onAddBelow(segments[segments.length - 1].id)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-white/40 hover:text-violet-300 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {d.addSegment}
      </button>
    </div>
  );
}
