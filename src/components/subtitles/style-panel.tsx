"use client";

import type { SubtitleStyle } from "@/lib/types";
import { useDictionary } from "@/lib/i18n/dictionary-context";

interface StylePanelProps {
  style: SubtitleStyle;
  onChange: (updates: Partial<SubtitleStyle>) => void;
}

const FONT_OPTIONS: { value: SubtitleStyle["fontFamily"]; label: string }[] = [
  { value: "noto-sans-sinhala", label: "Noto Sans Sinhala" },
  { value: "inter", label: "Inter" },
  { value: "arial", label: "Arial" },
];

export function StylePanel({ style, onChange }: StylePanelProps) {
  const dict = useDictionary();
  const d = dict.subtitles;

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-white">{d.styleTitle}</h3>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-white/50">{d.font}</span>
        <select
          value={style.fontFamily}
          onChange={(e) =>
            onChange({ fontFamily: e.target.value as SubtitleStyle["fontFamily"] })
          }
          className="bg-[#1a1a2e] border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-white/50">
          {d.fontSize} ({style.fontSizePct.toFixed(1)}%)
        </span>
        <input
          type="range"
          min={2}
          max={10}
          step={0.5}
          value={style.fontSizePct}
          onChange={(e) => onChange({ fontSizePct: Number(e.target.value) })}
          className="accent-violet-500"
        />
      </label>

      <div className="flex gap-4">
        <label className="flex flex-col gap-1.5 flex-1">
          <span className="text-xs text-white/50">{d.textColor}</span>
          <input
            type="color"
            value={style.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-9 w-full rounded-lg bg-transparent border border-white/15 cursor-pointer"
          />
        </label>
        <label className="flex flex-col gap-1.5 flex-1">
          <span className="text-xs text-white/50">{d.backgroundColor}</span>
          <input
            type="color"
            value={style.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            className="h-9 w-full rounded-lg bg-transparent border border-white/15 cursor-pointer"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-white/50">
          {d.backgroundOpacity} ({Math.round(style.backgroundOpacity * 100)}%)
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={style.backgroundOpacity}
          onChange={(e) => onChange({ backgroundOpacity: Number(e.target.value) })}
          className="accent-violet-500"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-white/50">{d.position}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {(["top", "middle", "bottom"] as const).map((anchor) => (
            <button
              key={anchor}
              onClick={() => onChange({ anchor })}
              className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                style.anchor === anchor
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "bg-white/5 border-white/15 text-white/60 hover:text-white"
              }`}
            >
              {d[anchor]}
            </button>
          ))}
        </div>
      </div>

      {style.anchor !== "middle" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">
            {d.verticalOffset} ({style.verticalOffsetPct}%)
          </span>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={style.verticalOffsetPct}
            onChange={(e) =>
              onChange({ verticalOffsetPct: Number(e.target.value) })
            }
            className="accent-violet-500"
          />
        </label>
      )}
    </div>
  );
}
