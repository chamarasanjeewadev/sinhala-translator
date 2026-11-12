"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconTile, type Tone } from "@/components/tool-catalog";
import type { LucideIcon } from "lucide-react";

export type TourStep = {
  /** Matches an element's data-tour attribute. Missing/hidden target → centred card. */
  target?: string;
  title: string;
  body: string;
  icon?: LucideIcon;
  tone?: Tone;
};

type Labels = { next: string; back: string; skip: string; done: string; stepOf: string };

const PAD = 8;
const CARD_W = 340;

function visibleRect(target?: string): DOMRect | null {
  if (!target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? r : null;
}

export function OnboardingTour({
  steps,
  open,
  onClose,
  labels,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  labels: Labels;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Bring the target into view, then track it while the page moves.
  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const update = () => setRect(visibleRect(step.target));
    update();
    const t = window.setTimeout(update, 350); // after smooth scroll settles
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step]);

  const go = useCallback(
    (d: 1 | -1) => {
      if (d === 1 && last) return onClose();
      setI((n) => Math.min(steps.length - 1, Math.max(0, n + d)));
    },
    [last, onClose, steps.length],
  );

  useEffect(() => {
    if (!open) return;
    nextRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, i, go, onClose]);

  if (!open || !step || typeof document === "undefined") return null;

  // Card below the target, or above when there's no room; centred when there's no target.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(CARD_W, vw - 24);
  let cardStyle: React.CSSProperties;
  if (rect) {
    const below = rect.bottom + PAD + 12;
    const placeBelow = below + 220 < vh || rect.top < 240;
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - w / 2), vw - w - 12);
    cardStyle = placeBelow
      ? { top: Math.min(below, vh - 230), left, width: w }
      : { bottom: vh - rect.top + PAD + 12, left, width: w };
  } else {
    cardStyle = { top: "50%", left: "50%", width: w, transform: "translate(-50%, -50%)" };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-2xl ring-2 ring-white transition-all duration-300"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(21,32,27,0.55)",
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-[rgba(21,32,27,0.55)]" />
      )}
      {/* Blocks clicks on the page underneath while the tour is open. */}
      <div className="fixed inset-0" />

      <div
        className="fixed rounded-3xl border border-white/80 bg-white p-5 shadow-[0_24px_60px_rgba(21,32,27,0.25)] transition-all duration-300"
        style={cardStyle}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.skip}
          className="absolute right-3 top-3 rounded-full p-1.5 text-[#5b6660] hover:bg-[#eef3ec] hover:text-[#15201b]"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-3 flex items-center gap-3 pr-6">
          {step.icon && <IconTile icon={step.icon} tone={step.tone ?? "mint"} size="lg" />}
          <h2 id="tour-title" className="font-display text-base font-bold leading-snug text-[#15201b]">
            {step.title}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-[#5b6660]">{step.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-[#8f9a94]">
            {labels.stepOf.replace("{n}", String(i + 1)).replace("{total}", String(steps.length))}
          </span>
          <div className="flex items-center gap-2">
            {i > 0 ? (
              <button
                type="button"
                onClick={() => go(-1)}
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-[#5b6660] hover:bg-[#eef3ec] hover:text-[#15201b]"
              >
                {labels.back}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-[#5b6660] hover:bg-[#eef3ec] hover:text-[#15201b]"
              >
                {labels.skip}
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={() => go(1)}
              className="rounded-full bg-[#15201b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2c3a33] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7d5b] focus-visible:ring-offset-2"
            >
              {last ? labels.done : labels.next}
            </button>
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {steps.map((_, n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-[#15201b]" : "w-1.5 bg-[#d3dcd4]"}`}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Per-user "seen" flag. Storage can throw in private mode; then we just don't auto-show. */
export const tourSeen = {
  key: (userId: string) => `hv_tour_v1:${userId}`,
  get(userId: string) {
    try {
      return localStorage.getItem(this.key(userId)) === "1";
    } catch {
      return true;
    }
  },
  set(userId: string) {
    try {
      localStorage.setItem(this.key(userId), "1");
    } catch {
      /* ignore */
    }
  },
};
