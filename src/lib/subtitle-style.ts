import type { SubtitleStyle } from "./types";

// Single source of truth for how a subtitle looks. The editor preview renders
// it as a DOM overlay (subtitleOverlayCss) and the MP4 export draws the same
// rules onto a canvas (drawSubtitle) — keep the two visually in sync.

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: "noto-sans-sinhala",
  fontSizePct: 4.5,
  color: "#ffffff",
  backgroundColor: "#000000",
  backgroundOpacity: 0.6,
  anchor: "bottom",
  verticalOffsetPct: 5,
};

export const FONT_STACKS: Record<SubtitleStyle["fontFamily"], string> = {
  "noto-sans-sinhala":
    "var(--font-noto-sinhala), 'Noto Sans Sinhala', sans-serif",
  inter: "var(--font-inter), Inter, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
};

/** Font stacks usable in a canvas 2D context (no CSS variables) */
export const CANVAS_FONT_STACKS: Record<SubtitleStyle["fontFamily"], string> = {
  "noto-sans-sinhala": "'Noto Sans Sinhala', sans-serif",
  inter: "Inter, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
};

export function mergeStyle(style: Partial<SubtitleStyle> | null | undefined): SubtitleStyle {
  return { ...DEFAULT_SUBTITLE_STYLE, ...(style ?? {}) };
}

function hexToRgba(hex: string, opacity: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return `rgba(0, 0, 0, ${opacity})`;
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * CSS for the positioned overlay wrapper and the text element, given the
 * rendered height of the <video> element in pixels.
 */
export function subtitleOverlayCss(
  style: SubtitleStyle,
  videoHeightPx: number
): { wrapper: React.CSSProperties; text: React.CSSProperties } {
  const offset = `${style.verticalOffsetPct}%`;

  const wrapper: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "90%",
    pointerEvents: "none",
  };

  if (style.anchor === "top") {
    wrapper.top = offset;
    wrapper.transform = "translateX(-50%)";
  } else if (style.anchor === "middle") {
    wrapper.top = "50%";
    wrapper.transform = "translate(-50%, -50%)";
  } else {
    wrapper.bottom = offset;
    wrapper.transform = "translateX(-50%)";
  }

  const fontSize = (style.fontSizePct / 100) * videoHeightPx;

  const text: React.CSSProperties = {
    fontFamily: FONT_STACKS[style.fontFamily],
    fontSize: `${fontSize}px`,
    lineHeight: 1.3,
    color: style.color,
    backgroundColor: hexToRgba(style.backgroundColor, style.backgroundOpacity),
    padding: `${fontSize * 0.15}px ${fontSize * 0.4}px`,
    borderRadius: `${fontSize * 0.15}px`,
    textAlign: "center",
    whiteSpace: "pre-line",
    width: "fit-content",
    margin: "0 auto",
  };

  return { wrapper, text };
}

/**
 * Draw a subtitle onto a canvas frame using the same visual rules as the DOM
 * overlay: centered lines, a background pill per line, size relative to the
 * video height.
 */
export function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  style: SubtitleStyle,
  text: string,
  width: number,
  height: number
): void {
  const lines = text.split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) return;

  const fontSize = (style.fontSizePct / 100) * height;
  const lineHeight = fontSize * 1.3;
  const padX = fontSize * 0.4;
  const padY = fontSize * 0.15;
  const radius = fontSize * 0.15;
  const blockHeight = lines.length * (lineHeight + padY * 2);

  let blockTop: number;
  if (style.anchor === "top") {
    blockTop = (style.verticalOffsetPct / 100) * height;
  } else if (style.anchor === "middle") {
    blockTop = height / 2 - blockHeight / 2;
  } else {
    blockTop = height - (style.verticalOffsetPct / 100) * height - blockHeight;
  }

  ctx.save();
  ctx.font = `${fontSize}px ${CANVAS_FONT_STACKS[style.fontFamily]}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  lines.forEach((line, i) => {
    const metrics = ctx.measureText(line);
    const lineWidth = Math.min(metrics.width, width * 0.9);
    const boxWidth = lineWidth + padX * 2;
    const boxHeight = lineHeight + padY * 2;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = blockTop + i * boxHeight;

    ctx.fillStyle = hexToRgba(style.backgroundColor, style.backgroundOpacity);
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
    ctx.fill();

    ctx.fillStyle = style.color;
    ctx.fillText(line, width / 2, boxY + boxHeight / 2, width * 0.9);
  });

  ctx.restore();
}
