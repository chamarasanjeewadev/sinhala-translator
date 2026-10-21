"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, FileType, File, Hash, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  exportTranscript,
  type ExportFormat,
  type ExportSource,
} from "@/lib/transcript-export";

export interface ExportMenuLabels {
  download: string;
  pdf: string;
  word: string;
  text: string;
  markdown: string;
  pdfHint: string;
  failed: string;
}

/**
 * "Download ▾" button with PDF / Word / Text / Markdown options. The menu is
 * portalled with fixed positioning so it isn't clipped by scrolling lists.
 */
export function ExportMenu({
  source,
  labels,
  compact = false,
}: {
  source: () => ExportSource;
  labels: ExportMenuLabels;
  /** Hide the text label on small screens (list rows). */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    window.addEventListener("scroll", () => setOpen(false), { once: true, capture: true });
    window.addEventListener("resize", () => setOpen(false), { once: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    const rect = buttonRef.current!.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setOpen(true);
  };

  const run = async (format: ExportFormat) => {
    setBusy(format);
    try {
      await exportTranscript(source(), format);
      if (format === "pdf") toast.info(labels.pdfHint);
      setOpen(false);
    } catch {
      toast.error(labels.failed);
    } finally {
      setBusy(null);
    }
  };

  const items: { format: ExportFormat; label: string; icon: typeof File }[] = [
    { format: "pdf", label: labels.pdf, icon: File },
    { format: "docx", label: labels.word, icon: FileType },
    { format: "txt", label: labels.text, icon: FileText },
    { format: "md", label: labels.markdown, icon: Hash },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title={labels.download}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 bg-[#e7eeff] hover:bg-[#d8e3fb] text-[#340075] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span className={compact ? "hidden sm:inline" : ""}>{labels.download}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[60] min-w-[180px] rounded-2xl bg-white p-1.5 shadow-[0_12px_32px_rgba(17,28,45,0.16)] border border-[#f0f3ff]"
          >
            {items.map(({ format, label, icon: Icon }) => (
              <button
                key={format}
                role="menuitem"
                type="button"
                disabled={busy !== null}
                onClick={() => run(format)}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#111c2d] hover:bg-[#f0f3ff] disabled:opacity-60 text-left"
              >
                {busy === format ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#340075]" />
                ) : (
                  <Icon className="w-4 h-4 text-[#340075]" />
                )}
                {label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
