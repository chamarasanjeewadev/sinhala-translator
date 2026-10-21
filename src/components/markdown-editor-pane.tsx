"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Heading, List, Eye, Pencil, HelpCircle, X } from "lucide-react";
import { MarkdownView } from "./markdown-view";
import { useSinglishTyping } from "./singlish/use-singlish-typing";
import { SinglishWordPreview } from "./singlish/singlish-word-preview";
import { SinglishGuideGrid } from "./singlish/singlish-guide";

const SINGLISH_PREF_KEY = "hv-singlish-typing";

function readSinglishPref(): boolean {
  try {
    return localStorage.getItem(SINGLISH_PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

export interface SinglishLabels {
  toggle: string;
  on: string;
  off: string;
  guideTitle: string;
  guideHint: string;
  /** Shown in the preview strip while no word is being typed. */
  previewIdle: string;
}

type Mode = "write" | "preview";

/**
 * The editable content area for one language pane in the Edit modal.
 * Provides a Write | Preview toggle, a small markdown formatting toolbar
 * (only in Write mode), a textarea, and a rendered preview.
 * The surrounding pane header (label / char count / Reset) stays in the parent.
 */
export function MarkdownEditorPane({
  value,
  onChange,
  placeholder,
  textClassName = "",
  autoFocus = false,
  ariaLabel,
  singlish = false,
  singlishLabels,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra classes for the textarea + preview (e.g. `sinhala-text`). */
  textClassName?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
  /** Offer Helakuru-style Singlish → Sinhala typing (Sinhala pane). */
  singlish?: boolean;
  singlishLabels?: SinglishLabels;
}) {
  const [mode, setMode] = useState<Mode>("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Singlish typing ──
  const [singlishOn, setSinglishOn] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (singlish) setSinglishOn(readSinglishPref());
  }, [singlish]);

  const singlishActive = singlish && singlishOn && mode === "write";
  const { pending } = useSinglishTyping({ textareaRef, value, onChange, enabled: singlishActive });

  const toggleSinglish = () => {
    const next = !singlishOn;
    setSinglishOn(next);
    try {
      localStorage.setItem(SINGLISH_PREF_KEY, next ? "on" : "off");
    } catch {
      // storage unavailable — preference just isn't remembered
    }
    textareaRef.current?.focus();
  };

  // Wrap the current selection with `marker` on both sides (bold / italic).
  const wrapSelection = (marker: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || "text";
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + marker.length;
      el.selectionEnd = start + marker.length + selected.length;
    });
  };

  // Prefix the start of the current line with `prefix` (heading / list).
  const prefixLine = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + prefix.length;
      el.selectionStart = pos;
      el.selectionEnd = pos;
    });
  };

  const toolbarBtn =
    "w-8 h-8 rounded-lg hover:bg-[#e7eeff] flex items-center justify-center text-[#4a4452] transition-colors";
  const tabBtn = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
      active ? "bg-[#340075] text-white" : "text-[#4a4452] hover:bg-[#e7eeff]"
    }`;

  return (
    <div className="flex flex-col flex-1 min-h-0 px-3 pb-3 pt-1">
      {/* Toggle + toolbar — wraps instead of overflowing in narrow panes */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-1 bg-[#f9f9ff] rounded-full p-0.5">
          <button type="button" onClick={() => setMode("write")} className={tabBtn(mode === "write")}>
            <Pencil className="w-3.5 h-3.5" />
            Write
          </button>
          <button type="button" onClick={() => setMode("preview")} className={tabBtn(mode === "preview")}>
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
        {mode === "write" && (
          <div className="flex items-center gap-0.5">
            <button type="button" title="Bold" onClick={() => wrapSelection("**")} className={toolbarBtn}>
              <Bold className="w-4 h-4" />
            </button>
            <button type="button" title="Italic" onClick={() => wrapSelection("*")} className={toolbarBtn}>
              <Italic className="w-4 h-4" />
            </button>
            <button type="button" title="Heading" onClick={() => prefixLine("## ")} className={toolbarBtn}>
              <Heading className="w-4 h-4" />
            </button>
            <button type="button" title="List" onClick={() => prefixLine("- ")} className={toolbarBtn}>
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Singlish switch */}
      {singlish && singlishLabels && mode === "write" && (
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0 rounded-2xl bg-[#f0f3ff] pl-2 pr-1 py-1">
          <button
            type="button"
            role="switch"
            aria-checked={singlishOn}
            onClick={toggleSinglish}
            title={singlishLabels.toggle}
            className="flex items-center gap-2 min-w-0 text-left"
          >
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                singlishOn ? "bg-[#340075]" : "bg-[#c9c3d3]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                  singlishOn ? "left-[18px]" : "left-0.5"
                }`}
              />
            </span>
            <span className="text-xs font-semibold text-[#111c2d] truncate">
              <span className="sinhala-text">අ</span> {singlishOn ? singlishLabels.on : singlishLabels.off}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[#340075] hover:bg-[#e7eeff] shrink-0"
          >
            {showGuide ? <X className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
            {singlishLabels.guideTitle}
          </button>
        </div>
      )}

      {showGuide && singlishLabels && mode === "write" && (
        <div className="mb-2 shrink-0 max-h-48 overflow-y-auto rounded-2xl bg-[#f9f9ff] px-3 py-2.5 text-xs text-[#4a4452]">
          <p className="mb-2">{singlishLabels.guideHint}</p>
          <SinglishGuideGrid
            compact
            romanClassName="text-[#111c2d]"
            sinhalaClassName="text-[#340075]"
          />
        </div>
      )}

      {/* Editor / preview */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col rounded-2xl bg-[#f9f9ff] focus-within:bg-[#f0f3ff] transition-colors">
        {mode === "write" ? (
          <>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              aria-label={ariaLabel}
              className={`w-full flex-1 min-h-[220px] resize-none bg-transparent border-0 outline-none px-4 py-3 text-[#111c2d] text-base leading-relaxed ${textClassName}`}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              autoFocus={autoFocus}
            />
            {singlishActive && singlishLabels && (
              <SinglishWordPreview
                pending={pending}
                idleHint={singlishLabels.previewIdle}
                className="shrink-0 border-t border-[#e7eeff] py-1"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full min-h-[220px] overflow-y-auto px-4 py-3">
            {value.trim() ? (
              <MarkdownView className={textClassName}>{value}</MarkdownView>
            ) : (
              <p className="text-sm text-[#4a4452]">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
