"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Mic, Square, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useSinglishTyping } from "@/components/singlish/use-singlish-typing";
import { SinglishWordPreview } from "@/components/singlish/singlish-word-preview";
import { ExportMenu } from "@/components/export-menu";
import { singlishToSinhala } from "@/lib/singlish";
import { sinhalaToSinglish } from "@/lib/sinhala-to-singlish";
import { unicodeToFmAbhaya } from "@/lib/sinhala-legacy";
import { useSinhalaVoiceTyping } from "./use-sinhala-voice-typing";

const STORAGE_KEY = "hv-singlish-tool-text";

export type SinglishToolLabels = Record<
  | "editorLabel" | "placeholder" | "singlishOn" | "singlishOff" | "previewIdle" | "listeningHint"
  | "voiceStart" | "voiceStop" | "voiceUnsupported" | "voiceDenied" | "voiceError"
  | "convertPasted" | "convertedToast" | "nothingToConvert" | "copy" | "copied" | "clear"
  | "clearConfirm" | "words" | "chars" | "savedLocally" | "outputsTitle" | "tabLegacy"
  | "tabSinglish" | "legacyHint" | "singlishHint" | "outputEmpty" | "download" | "exportPdf"
  | "exportWord" | "exportText" | "exportMarkdown" | "exportPdfHint" | "exportFailed" | "docTitle",
  string
>;

type OutputTab = "legacy" | "singlish";

function useCopy(copiedLabel: string) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(copiedLabel);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
    } catch {
      // clipboard blocked — nothing useful to do
    }
  };
  return { copiedKey, copy };
}

export function SinglishTool({ labels: l }: { labels: SinglishToolLabels }) {
  const [text, setText] = useState("");
  const [singlishOn, setSinglishOn] = useState(true);
  const [tab, setTab] = useState<OutputTab>("legacy");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { copiedKey, copy } = useCopy(l.copied);

  // Restore / autosave the draft in this browser only.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setText(saved);
    } catch {
      // storage unavailable
    }
  }, []);
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (text) localStorage.setItem(STORAGE_KEY, text);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        // storage unavailable
      }
    }, 400);
    return () => clearTimeout(id);
  }, [text]);

  const { pending } = useSinglishTyping({ textareaRef, value: text, onChange: setText, enabled: singlishOn });

  // Insert recognised speech at the caret.
  const insertAtCaret = (insert: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const spacer = before && !/\s$/.test(before) ? " " : "";
    const next = before + spacer + insert + text.slice(end);
    setText(next);
    const caret = start + spacer.length + insert.length;
    requestAnimationFrame(() => el?.setSelectionRange(caret, caret));
  };
  const voice = useSinhalaVoiceTyping({
    onFinal: insertAtCaret,
    onError: (kind) => toast.error(kind === "denied" ? l.voiceDenied : l.voiceError),
  });

  const convertPasted = () => {
    if (!/[A-Za-z]/.test(text)) {
      toast.info(l.nothingToConvert);
      return;
    }
    setText(singlishToSinhala(text));
    toast.success(l.convertedToast);
  };

  const clear = () => {
    if (text && !confirm(l.clearConfirm)) return;
    setText("");
    textareaRef.current?.focus();
  };

  const legacy = useMemo(() => unicodeToFmAbhaya(text), [text]);
  const roman = useMemo(() => sinhalaToSinglish(text), [text]);
  const output = tab === "legacy" ? legacy : roman;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const pill =
    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] text-[#111c2d]">
      {/* ── Editor ── */}
      <div className="rounded-3xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
          <button
            type="button"
            role="switch"
            aria-checked={singlishOn}
            onClick={() => {
              setSinglishOn((v) => !v);
              textareaRef.current?.focus();
            }}
            className="flex items-center gap-2 min-w-0 text-left"
          >
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                singlishOn ? "bg-[#340075]" : "bg-[#c9c3d3]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  singlishOn ? "left-[22px]" : "left-0.5"
                }`}
              />
            </span>
            <span className="text-sm font-semibold truncate">
              <span className="sinhala-text">අ</span> {singlishOn ? l.singlishOn : l.singlishOff}
            </span>
          </button>

          {voice.supported ? (
            <button
              type="button"
              onClick={voice.listening ? voice.stop : voice.start}
              className={`${pill} ${
                voice.listening
                  ? "bg-[#ba1a1a] text-white hover:bg-[#93000a]"
                  : "bg-[#e7eeff] text-[#340075] hover:bg-[#d8e3fb]"
              }`}
            >
              {voice.listening ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {voice.listening ? l.voiceStop : l.voiceStart}
            </button>
          ) : (
            <span className="text-xs text-[#4a4452]">{l.voiceUnsupported}</span>
          )}
        </div>

        <label htmlFor="singlish-editor" className="sr-only">
          {l.editorLabel}
        </label>
        <div className="m-4 mb-0 flex flex-col rounded-2xl bg-[#f9f9ff] focus-within:bg-[#f0f3ff] focus-within:ring-2 focus-within:ring-[#340075]/15 transition">
          <textarea
            id="singlish-editor"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={l.placeholder}
            className="sinhala-text w-full min-h-[300px] sm:min-h-[360px] resize-y bg-transparent border-0 outline-none px-4 py-3.5 text-lg leading-relaxed"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
          <SinglishWordPreview
            pending={voice.listening ? null : pending}
            idleHint={voice.listening ? voice.interim || l.listeningHint : singlishOn ? l.previewIdle : ""}
            className="border-t border-[#e7eeff] py-1.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-4">
          <button type="button" onClick={() => copy("editor", text)} disabled={!text} className={`${pill} bg-gradient-to-r from-[#340075] to-[#4c1d95] text-white hover:opacity-90`}>
            {copiedKey === "editor" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === "editor" ? l.copied : l.copy}
          </button>
          <button type="button" onClick={convertPasted} disabled={!text} className={`${pill} bg-[#e7eeff] text-[#340075] hover:bg-[#d8e3fb]`}>
            <Wand2 className="w-3.5 h-3.5" />
            {l.convertPasted}
          </button>
          <ExportMenu
            source={() => ({
              id: "sinhala-text",
              title: l.docTitle,
              createdAt: new Date().toISOString(),
              sinhala: text,
              english: null,
              labels: { sinhala: l.docTitle, english: "" },
            })}
            labels={{
              download: l.download,
              pdf: l.exportPdf,
              word: l.exportWord,
              text: l.exportText,
              markdown: l.exportMarkdown,
              pdfHint: l.exportPdfHint,
              failed: l.exportFailed,
            }}
          />
          <button type="button" onClick={clear} disabled={!text} className={`${pill} text-[#ba1a1a] hover:bg-[#ffdad6]`}>
            <Trash2 className="w-3.5 h-3.5" />
            {l.clear}
          </button>
          <span className="ml-auto text-xs text-[#4a4452]">
            {l.words.replace("{count}", String(words))} · {l.chars.replace("{count}", String(text.length))}
          </span>
        </div>
      </div>

      {/* ── Other formats ── */}
      <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-4 flex flex-col text-white">
        <h2 className="text-sm font-semibold mb-3">{l.outputsTitle}</h2>
        <div role="tablist" className="flex gap-1 rounded-full bg-white/[0.06] p-1 mb-3">
          {(
            [
              ["legacy", l.tabLegacy],
              ["singlish", l.tabSinglish],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === key ? "bg-white text-[#340075]" : "text-white/60 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/50 leading-relaxed mb-3">
          {tab === "legacy" ? l.legacyHint : l.singlishHint}
        </p>
        <div className="flex-1 min-h-[160px] max-h-[360px] overflow-y-auto rounded-2xl bg-black/30 border border-white/10 px-4 py-3 font-mono text-sm text-white/85 whitespace-pre-wrap break-words">
          {text ? output : <span className="font-sans text-white/40">{l.outputEmpty}</span>}
        </div>
        <button
          type="button"
          onClick={() => copy(tab, output)}
          disabled={!text}
          className={`${pill} mt-3 self-start bg-white/10 text-white hover:bg-white/15`}
        >
          {copiedKey === tab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedKey === tab ? l.copied : l.copy}
        </button>
        <p className="mt-auto pt-4 text-[11px] text-white/35">{l.savedLocally}</p>
      </div>
    </div>
  );
}
