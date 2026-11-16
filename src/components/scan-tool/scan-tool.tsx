"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, FileText, ImagePlus, Loader2, ScanText, Volume2, Languages, X } from "lucide-react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/client-error";
import { trackEvent } from "@/lib/analytics";
import { prepareImage } from "@/lib/image-prep";
import { writeHandoffText } from "@/lib/handoff";
import { SCAN_MAX_PAGES, isScanMime, trimForTts } from "@/lib/scan-to-text";
import { TTS_MAX_CHARS } from "@/lib/text-to-speech";

export type ScanToolLabels = Record<
  | "drop" | "dropHint" | "addMore" | "tooManyPages" | "unsupportedImage" | "unreadableImage" | "remove" | "page"
  | "extract" | "extracting" | "editPage" | "combined" | "copy" | "copied" | "download" | "listen" | "translate"
  | "truncated" | "hintAnon" | "hintFree" | "hintPaid" | "loginTitle" | "loginBody" | "signUp" | "logIn"
  | "noCredits" | "buyCredits" | "noTextFound" | "rateLimited" | "failed" | "serviceBusy" | "stopped"
  | "done" | "doneFree",
  string
>;

type Status = { signedIn: boolean; freePagesLeft: number; credits: number };
type Page = {
  id: number;
  base64: string;
  previewUrl: string;
  text: string;
  state: "idle" | "done" | "error";
  error?: string;
};

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7cc3dd]";
const pill = `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${focus}`;
let nextId = 1;

export function ScanTool({
  labels: l,
  signupHref,
  loginHref,
  pricingHref,
  listenHref,
  translateHref,
}: {
  labels: ScanToolLabels;
  signupHref: string;
  loginHref: string;
  pricingHref: string;
  listenHref: string;
  translateHref: string;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<{ n: number; total: number } | null>(null); // n: 1-based page being read
  const [gate, setGate] = useState<"login" | "credits" | null>(null);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  useEffect(() => {
    fetch("/api/scan-to-text")
      .then((r) => (r.ok ? (r.json() as Promise<Status>) : null))
      .then((s) => s && setStatus(s))
      .catch(() => {});
  }, []);

  useEffect(() => () => pagesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    const supported = files.filter((f) => isScanMime(f.type));
    if (supported.length < files.length) toast.error(l.unsupportedImage);
    const room = SCAN_MAX_PAGES - pagesRef.current.length;
    if (supported.length > room) toast.error(l.tooManyPages.replace("{max}", String(SCAN_MAX_PAGES)));
    const added: Page[] = [];
    for (const f of supported.slice(0, Math.max(0, room))) {
      try {
        const { base64, previewUrl } = await prepareImage(f);
        added.push({ id: nextId++, base64, previewUrl, text: "", state: "idle" });
      } catch {
        toast.error(l.unreadableImage);
      }
    }
    setPages((p) => [...p, ...added]);
    setSummary("");
  };

  const remove = (id: number) =>
    setPages((p) => {
      const gone = p.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return p.filter((x) => x.id !== id);
    });

  const patch = (id: number, v: Partial<Page>) => setPages((p) => p.map((x) => (x.id === id ? { ...x, ...v } : x)));

  const extract = async () => {
    if (busy) return;
    if (status && !status.signedIn) return void setGate("login");
    setGate(null);
    setSummary("");
    const todo = pagesRef.current.filter((p) => p.state !== "done");
    let charged = 0;
    let stopped = false;
    for (const [i, p] of todo.entries()) {
      setBusy({ n: i + 1, total: todo.length });
      try {
        const res = await fetch("/api/scan-to-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: p.base64, mimeType: "image/jpeg" }),
        });
        const data = (await res.json().catch(() => null)) as
          | ({ error?: string; code?: string } & Partial<{ text: string; freePagesLeft: number; charged: number; creditsRemaining: number }>)
          | null;
        if (res.ok && data?.text !== undefined) {
          charged += data.charged ?? 0;
          patch(p.id, { text: data.text, state: "done", error: undefined });
          setStatus({ signedIn: true, freePagesLeft: data.freePagesLeft ?? 0, credits: data.creditsRemaining ?? 0 });
          continue;
        }
        if (res.status === 401) { setGate("login"); stopped = true; break; }
        if (res.status === 402) { setGate("credits"); stopped = true; trackEvent("scan_gate", { reason: "credits" }); break; }
        if (res.status === 429) { toast.error(l.rateLimited); stopped = true; break; }
        patch(p.id, {
          state: "error",
          error: data?.code === "NO_TEXT_FOUND" ? l.noTextFound : apiErrorMessage(data, { serviceBusy: l.serviceBusy }, l.failed),
        });
      } catch {
        patch(p.id, { state: "error", error: l.failed });
      }
    }
    setBusy(null);
    if (stopped) setSummary(l.stopped);
    else setSummary(charged > 0 ? l.done.replace("{charged}", String(charged)) : l.doneFree);
    trackEvent("scan_extracted", { pages: todo.length, credits: charged });
  };

  const combined = pages.filter((p) => p.text.trim()).map((p) => p.text.trim()).join("\n\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(combined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(l.failed);
    }
  };

  const downloadTxt = () => {
    const url = URL.createObjectURL(new Blob([combined], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "helavoice-scan.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const listen = () => {
    const { text, truncated } = trimForTts(combined, TTS_MAX_CHARS);
    if (truncated) toast.info(l.truncated.replace("{limit}", String(TTS_MAX_CHARS)));
    writeHandoffText(text);
    router.push(listenHref);
  };

  const translate = () => {
    writeHandoffText(combined);
    router.push(translateHref);
  };

  const hint = !status
    ? ""
    : !status.signedIn
      ? l.hintAnon
      : status.freePagesLeft > 0
        ? l.hintFree.replace("{count}", String(status.freePagesLeft))
        : l.hintPaid.replace("{credits}", String(status.credits));

  return (
    <div className="relative rounded-[28px] bg-white/50 p-2 text-ink shadow-[0_30px_80px_rgba(21,32,27,0.10)] ring-1 ring-white/80 backdrop-blur-xl sm:p-3">
      <div className="rounded-[20px] bg-white p-4 sm:p-5">
        <label
          className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-ink/15 px-4 py-8 text-center transition-colors hover:border-leaf/40 hover:bg-mint/30 focus-within:outline-2 focus-within:outline-[#7cc3dd] ${pages.length >= SCAN_MAX_PAGES ? "pointer-events-none opacity-50" : ""}`}
        >
          <ImagePlus className="h-6 w-6 text-leaf" aria-hidden />
          <span className="sinhala-text text-sm font-semibold">{pages.length ? l.addMore : l.drop}</span>
          <span className="sinhala-text text-xs text-ink/60">{l.dropHint.replace("{max}", String(SCAN_MAX_PAGES))}</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        {pages.length > 0 && (
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {pages.map((p, i) => (
              <li key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt={l.page.replace("{n}", String(i + 1))} className="aspect-[3/4] w-full rounded-xl object-cover ring-1 ring-ink/10" />
                <span className="absolute bottom-1 left-1 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {i + 1}
                  {p.state === "done" && " ✓"}
                </span>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  disabled={busy !== null}
                  aria-label={l.remove.replace("{n}", String(i + 1))}
                  className={`absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white disabled:opacity-40 ${focus}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            type="button"
            onClick={extract}
            disabled={!pages.some((p) => p.state !== "done") || busy !== null}
            className={`hero-primary-button inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold text-white disabled:pointer-events-none disabled:opacity-40 disabled:before:hidden ${focus}`}
          >
            {busy !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
            {busy !== null
              ? l.extracting.replace("{n}", String(busy.n)).replace("{total}", String(busy.total))
              : l.extract}
          </button>
          <span className="sinhala-text min-w-[12rem] flex-1 text-xs leading-relaxed text-ink/65" aria-live="polite">
            {summary || hint}
          </span>
        </div>
      </div>

      {gate && (
        <div role="alert" className="mx-2 mb-2 mt-3 rounded-2xl border border-leaf/25 bg-mint/70 p-4 text-sm sm:mx-3">
          {gate === "login" ? (
            <>
              <p className="font-semibold">{l.loginTitle}</p>
              <p className="mt-1 text-ink/70">{l.loginBody}</p>
              <div className="mt-3 flex gap-2">
                <Link href={signupHref} className={`${pill} hero-primary-button text-white`}>{l.signUp}</Link>
                <Link href={loginHref} className={`${pill} bg-white/60 text-ink hover:bg-white/80`}>{l.logIn}</Link>
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold">{l.noCredits}</p>
              <Link href={pricingHref} className={`${pill} hero-primary-button mt-3 text-white`}>{l.buyCredits}</Link>
            </>
          )}
        </div>
      )}

      {pages.some((p) => p.state !== "idle") && (
        <div className="mt-3 space-y-3 px-1 pb-1 sm:px-2">
          {pages.map((p, i) =>
            p.state === "idle" ? null : (
              <div key={p.id} className="rounded-2xl bg-white p-4">
                <label htmlFor={`scan-text-${p.id}`} className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink/70">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  {l.editPage.replace("{n}", String(i + 1))}
                </label>
                {p.state === "error" ? (
                  <p role="alert" className="text-sm text-[#ba1a1a]">{p.error}</p>
                ) : (
                  <textarea
                    id={`scan-text-${p.id}`}
                    value={p.text}
                    onChange={(e) => patch(p.id, { text: e.target.value })}
                    lang="si"
                    className="sinhala-text min-h-[140px] w-full resize-y rounded-xl bg-[#f6f9f6] px-3 py-2 text-lg leading-relaxed outline-none focus:ring-2 focus:ring-[#7cc3dd]"
                  />
                )}
              </div>
            )
          )}

          {combined && (
            <div className="rounded-2xl bg-white p-4">
              <label htmlFor="scan-combined" className="mb-2 block text-xs font-semibold text-ink/70">{l.combined}</label>
              <textarea
                id="scan-combined"
                readOnly
                value={combined}
                lang="si"
                className="sinhala-text min-h-[160px] w-full resize-y rounded-xl bg-[#f6f9f6] px-3 py-2 text-lg leading-relaxed outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={copy} className={`${pill} bg-mint/60 text-ink hover:bg-mint`}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? l.copied : l.copy}
                </button>
                <button type="button" onClick={downloadTxt} className={`${pill} bg-mint/60 text-ink hover:bg-mint`}>
                  <Download className="h-3.5 w-3.5" />
                  {l.download}
                </button>
                <button type="button" onClick={listen} className={`${pill} hero-primary-button text-white`}>
                  <Volume2 className="h-3.5 w-3.5" />
                  {l.listen}
                </button>
                <button type="button" onClick={translate} className={`${pill} bg-mint/60 text-ink hover:bg-mint`}>
                  <Languages className="h-3.5 w-3.5" />
                  {l.translate}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
