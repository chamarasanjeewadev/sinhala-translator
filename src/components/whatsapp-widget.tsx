"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { parsePathname } from "@/lib/i18n/utils";
import { WHATSAPP_NUMBER_DISPLAY, whatsappLink } from "@/lib/contact";

const SEEN_KEY = "hv-whatsapp-popup-seen";
const AUTO_OPEN_DELAY_MS = 5000;

/** Floating WhatsApp chat button; the popup auto-opens once on the home page. */
export function WhatsAppWidget() {
  const d = useDictionary().whatsapp;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHome = parsePathname(pathname ?? "/").rest === "/";

  useEffect(() => {
    if (!isHome) return;
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => setOpen(true), AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isHome]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage blocked (private mode) — the popup may show again; harmless.
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label={d.popupTitle}
          className="w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(17,28,45,0.25)] animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex items-start justify-between gap-3 bg-[#075e54] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <WhatsAppIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{d.popupTitle}</p>
                <p className="text-xs text-white/75">{WHATSAPP_NUMBER_DISPLAY}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={d.close}
              className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 bg-[#efeae2] px-4 py-4">
            <p className="rounded-xl rounded-tl-none bg-white px-3 py-2 text-sm leading-relaxed text-[#111c2d] shadow-sm">
              {d.popupBody}
            </p>
            <p className="text-xs text-[#4a4452]">{d.messagesOnly}</p>
            <a
              href={whatsappLink(d.prefill)}
              target="_blank"
              rel="noopener"
              onClick={close}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5a]"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {d.startChat}
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={d.buttonLabel}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_6px_20px_rgba(37,211,102,0.45)] transition-transform hover:scale-105"
      >
        <WhatsAppIcon className="h-7 w-7" />
      </button>
    </div>
  );
}
