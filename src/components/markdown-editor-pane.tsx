"use client";

import { useRef, useState } from "react";
import { Bold, Italic, Heading, List, Eye, Pencil } from "lucide-react";
import { MarkdownView } from "./markdown-view";

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
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra classes for the textarea + preview (e.g. `sinhala-text`). */
  textClassName?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}) {
  const [mode, setMode] = useState<Mode>("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      {/* Toggle + toolbar */}
      <div className="flex items-center justify-between mb-2 shrink-0">
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

      {/* Editor / preview */}
      <div className="flex-1 overflow-hidden min-h-0">
        {mode === "write" ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className={`w-full h-full min-h-[220px] resize-none rounded-2xl bg-[#f9f9ff] focus:bg-[#f0f3ff] border-0 outline-none px-4 py-3 text-[#111c2d] text-base leading-relaxed transition-colors ${textClassName}`}
            spellCheck={false}
            autoFocus={autoFocus}
          />
        ) : (
          <div className="w-full h-full min-h-[220px] overflow-y-auto rounded-2xl bg-[#f9f9ff] px-4 py-3">
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
