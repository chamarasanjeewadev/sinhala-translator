"use client";

import type { SinglishBuffer } from "@/lib/singlish";

/**
 * Strip under the editor showing the word being typed: "gedhara → ගෙදර".
 * Gives immediate feedback that Singlish typing is working.
 */
export function SinglishWordPreview({
  pending,
  idleHint,
  className = "",
}: {
  pending: SinglishBuffer | null;
  idleHint: string;
  className?: string;
}) {
  return (
    <div
      aria-live="polite"
      className={`flex items-center gap-2 min-h-8 px-3 text-xs ${className}`}
    >
      {pending ? (
        <>
          <code className="font-mono text-[#4a4452] truncate">{pending.roman}</code>
          <span className="text-[#4a4452]/60">→</span>
          <span className="sinhala-text text-base font-semibold text-[#340075] truncate">
            {pending.rendered}
          </span>
        </>
      ) : (
        <span className="text-[#4a4452]/80 truncate">{idleHint}</span>
      )}
    </div>
  );
}
