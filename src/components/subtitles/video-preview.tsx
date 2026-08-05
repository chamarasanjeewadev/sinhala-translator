"use client";

import { useState, useEffect, type RefObject } from "react";
import type { SubtitleStyle } from "@/lib/types";
import { subtitleOverlayCss } from "@/lib/subtitle-style";

interface VideoPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  /** Text of the segment covering the current playhead, if any */
  activeText: string | null;
  style: SubtitleStyle;
  onTimeUpdate: (currentTime: number) => void;
  onLoadedMetadata?: (durationSeconds: number) => void;
}

export function VideoPreview({
  videoRef,
  videoUrl,
  activeText,
  style,
  onTimeUpdate,
  onLoadedMetadata,
}: VideoPreviewProps) {
  const [videoHeightPx, setVideoHeightPx] = useState(0);

  // Track the rendered height of the video element so the overlay font size
  // (a percentage of video height) matches what burns into the export.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new ResizeObserver(() => {
      setVideoHeightPx(video.clientHeight);
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [videoRef, videoUrl]);

  const { wrapper, text } = subtitleOverlayCss(style, videoHeightPx);

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        playsInline
        className="w-full max-h-[420px]"
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => onLoadedMetadata?.(e.currentTarget.duration)}
      />
      {activeText && videoHeightPx > 0 && (
        <div style={wrapper} aria-hidden>
          <span style={text}>{activeText}</span>
        </div>
      )}
    </div>
  );
}
