"use client";

import { useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { SubtitleSegment } from "@/lib/types";
import { MIN_SEGMENT_DURATION_SEC } from "@/lib/subtitle-format";

interface TimelineProps {
  segments: SubtitleSegment[];
  durationSeconds: number;
  currentTime: number;
  selectedId: string | null;
  onSeek: (seconds: number) => void;
  onSelect: (id: string) => void;
  onUpdateTiming: (id: string, start: number, end: number) => void;
}

type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  id: string;
  mode: DragMode;
  pointerStartX: number;
  origStart: number;
  origEnd: number;
  /** Live values while dragging; committed on pointer-up */
  start: number;
  end: number;
}

const SNAP_SEC = 0.1;
const ZOOMED_PX_PER_SEC = 10;

function snap(sec: number): number {
  return Math.round(sec / SNAP_SEC) * SNAP_SEC;
}

export function Timeline({
  segments,
  durationSeconds,
  currentTime,
  selectedId,
  onSeek,
  onSelect,
  onUpdateTiming,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  const pxPerSec = useMemo(() => {
    if (zoomed) return ZOOMED_PX_PER_SEC;
    const available = trackWidth > 0 ? trackWidth : 800;
    return durationSeconds > 0 ? available / durationSeconds : 1;
  }, [zoomed, trackWidth, durationSeconds]);

  const totalWidth = Math.max(durationSeconds * pxPerSec, 1);

  // Ruler tick spacing that keeps labels readable at any zoom
  const tickInterval = useMemo(() => {
    const targetPx = 80;
    const raw = targetPx / pxPerSec;
    const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300];
    return steps.find((s) => s >= raw) ?? 600;
  }, [pxPerSec]);

  const ticks = useMemo(() => {
    const result: number[] = [];
    for (let t = 0; t <= durationSeconds; t += tickInterval) {
      result.push(t);
    }
    return result;
  }, [durationSeconds, tickInterval]);

  const clampDrag = (state: DragState, deltaSec: number): DragState => {
    const index = segments.findIndex((s) => s.id === state.id);
    const prev = segments[index - 1];
    const next = segments[index + 1];
    const minStart = prev ? prev.end : 0;
    const maxEnd = next ? next.start : durationSeconds;

    let { start, end } = state;
    if (state.mode === "move") {
      const length = state.origEnd - state.origStart;
      start = snap(state.origStart + deltaSec);
      start = Math.max(minStart, Math.min(start, maxEnd - length));
      end = start + length;
    } else if (state.mode === "resize-start") {
      start = snap(state.origStart + deltaSec);
      start = Math.max(
        minStart,
        Math.min(start, state.origEnd - MIN_SEGMENT_DURATION_SEC)
      );
    } else {
      end = snap(state.origEnd + deltaSec);
      end = Math.min(
        maxEnd,
        Math.max(end, state.origStart + MIN_SEGMENT_DURATION_SEC)
      );
    }
    return { ...state, start, end };
  };

  const beginDrag = (
    e: React.PointerEvent,
    seg: SubtitleSegment,
    mode: DragMode
  ) => {
    e.stopPropagation();
    onSelect(seg.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      id: seg.id,
      mode,
      pointerStartX: e.clientX,
      origStart: seg.start,
      origEnd: seg.end,
      start: seg.start,
      end: seg.end,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const deltaSec = (e.clientX - drag.pointerStartX) / pxPerSec;
    setDrag(clampDrag(drag, deltaSec));
  };

  const endDrag = () => {
    if (!drag) return;
    if (drag.start !== drag.origStart || drag.end !== drag.origEnd) {
      onUpdateTiming(drag.id, drag.start, drag.end);
    }
    setDrag(null);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const sec = (e.clientX - rect.left) / pxPerSec;
    onSeek(Math.max(0, Math.min(sec, durationSeconds)));
  };

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="flex items-center justify-end mb-1">
        <button
          onClick={() => setZoomed((z) => !z)}
          className="p-1 text-white/40 hover:text-white transition-colors"
          aria-label={zoomed ? "Zoom out" : "Zoom in"}
        >
          {zoomed ? (
            <ZoomOut className="w-4 h-4" />
          ) : (
            <ZoomIn className="w-4 h-4" />
          )}
        </button>
      </div>
      <div
        ref={(el) => {
          scrollRef.current = el;
          if (el) setTrackWidth(el.clientWidth);
        }}
        className="overflow-x-auto"
      >
        <div
          ref={trackRef}
          className="relative select-none"
          style={{ width: `${totalWidth}px` }}
          onClick={handleTrackClick}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* Ruler */}
          <div className="relative h-5 border-b border-white/10">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-0 text-[10px] text-white/35 font-mono"
                style={{ left: `${t * pxPerSec + 2}px` }}
              >
                {formatRulerTime(t)}
              </span>
            ))}
          </div>

          {/* Segment row */}
          <div className="relative h-14 mt-1">
            {segments.map((seg, i) => {
              const isDragging = drag?.id === seg.id;
              const start = isDragging ? drag.start : seg.start;
              const end = isDragging ? drag.end : seg.end;
              return (
                <div
                  key={seg.id}
                  onPointerDown={(e) => beginDrag(e, seg, "move")}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute top-0 h-full rounded-md border px-1.5 py-1 overflow-hidden cursor-grab active:cursor-grabbing ${
                    seg.id === selectedId
                      ? "bg-violet-600/60 border-violet-400"
                      : "bg-[#1e3a8a]/60 border-blue-700/60 hover:bg-[#1e3a8a]/80"
                  }`}
                  style={{
                    left: `${start * pxPerSec}px`,
                    width: `${Math.max((end - start) * pxPerSec, 8)}px`,
                  }}
                >
                  <span className="block text-[10px] text-white/60 font-mono leading-none mb-0.5">
                    {i + 1}
                  </span>
                  <span className="block text-[11px] text-white/90 leading-tight line-clamp-2 break-all">
                    {seg.text}
                  </span>
                  {/* Resize handles */}
                  <div
                    onPointerDown={(e) => beginDrag(e, seg, "resize-start")}
                    className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/20 opacity-0 hover:opacity-100"
                  />
                  <div
                    onPointerDown={(e) => beginDrag(e, seg, "resize-end")}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/20 opacity-0 hover:opacity-100"
                  />
                </div>
              );
            })}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
            style={{ left: `${currentTime * pxPerSec}px` }}
          />
        </div>
      </div>
    </div>
  );
}

function formatRulerTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
