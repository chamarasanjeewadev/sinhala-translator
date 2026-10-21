"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  backspaceSinglish,
  convertRomanWordBefore,
  isRomanLetter,
  typeSinglishLetter,
  type SinglishBuffer,
} from "@/lib/singlish";

/**
 * Live Singlish → Sinhala typing on a controlled <textarea>. Each roman letter
 * re-renders the current word; backspace edits its roman spelling. Returns the
 * word being typed so the UI can preview it ("gedhara → ගෙදර").
 */
export function useSinglishTyping({
  textareaRef,
  value,
  onChange,
  enabled,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  enabled: boolean;
}) {
  const [pending, setPending] = useState<SinglishBuffer | null>(null);
  const bufferRef = useRef<SinglishBuffer | null>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  // Restore the caret after a programmatic edit re-renders the textarea.
  useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    const el = textareaRef.current;
    if (caret === null || !el) return;
    pendingCaretRef.current = null;
    el.setSelectionRange(caret, caret);
  }, [value, textareaRef]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || !enabled) return;

    const setBuffer = (b: SinglishBuffer | null) => {
      bufferRef.current = b;
      setPending(b);
    };
    const apply = (text: string, caret: number) => {
      pendingCaretRef.current = caret;
      onChangeRef.current(text);
    };

    const onBeforeInput = (e: InputEvent) => {
      if (e.isComposing) return;
      const { selectionStart, selectionEnd } = el;
      // Some keyboards (and text replacements) insert several characters at once.
      if (e.inputType === "insertText" && e.data && [...e.data].some(isRomanLetter)) {
        e.preventDefault();
        let text = valueRef.current;
        let start = selectionStart;
        let end = selectionEnd;
        let buffer = bufferRef.current;
        for (const ch of e.data) {
          if (isRomanLetter(ch)) {
            const r = typeSinglishLetter(text, start, end, ch, buffer);
            ({ text, buffer } = r);
            start = end = r.caret;
          } else {
            text = text.slice(0, start) + ch + text.slice(end);
            start = end = start + ch.length;
            buffer = null;
          }
        }
        setBuffer(buffer);
        apply(text, start);
        return;
      }
      if (e.inputType === "deleteContentBackward") {
        const r = backspaceSinglish(valueRef.current, selectionStart, selectionEnd, bufferRef.current);
        if (r) {
          e.preventDefault();
          setBuffer(r.buffer);
          apply(r.text, r.caret);
          return;
        }
      }
      setBuffer(null);
    };

    // Fallback for keyboards that compose whole words (Android): when a space or
    // punctuation lands after a roman word, convert that word.
    const onInput = (e: Event) => {
      const ie = e as InputEvent;
      if (ie.inputType !== "insertText" || !ie.data || isRomanLetter(ie.data.slice(-1))) return;
      const caret = el.selectionStart;
      const trailing = ie.data.length - ie.data.replace(/[^A-Za-z]+$/, "").length;
      const end = caret - trailing;
      const r = convertRomanWordBefore(el.value, end);
      if (!r) return;
      e.stopPropagation(); // keep React's onChange from committing the unconverted text
      apply(r.text, r.caret + trailing);
    };

    // Moving the caret ends the current word.
    const endWord = () => setBuffer(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End" || e.key === "Escape") endWord();
    };

    el.addEventListener("beforeinput", onBeforeInput);
    el.addEventListener("input", onInput);
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("mousedown", endWord);
    el.addEventListener("blur", endWord);
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
      el.removeEventListener("input", onInput);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("mousedown", endWord);
      el.removeEventListener("blur", endWord);
      setBuffer(null);
    };
  }, [enabled, textareaRef]);

  return { pending };
}
