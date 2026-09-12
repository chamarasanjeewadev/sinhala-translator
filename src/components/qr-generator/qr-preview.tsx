"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type QRCodeStyling from "qr-code-styling";
import { toQrOptions, type QrDesign } from "@/lib/qr-design";
import { cn } from "@/lib/utils";

const RENDER_SIZE = 1024; // large draw buffer → crisp downloads; CSS scales it down

export interface PreviewCopy {
  previewLabel: string;
  emptyHint: string;
  downloadTitle: string;
  scanMeDefault: string;
}

type Format = "png" | "jpeg" | "svg";

export function QrPreview({
  data,
  design,
  copy,
}: {
  data: string;
  design: QrDesign;
  copy: PreviewCopy;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);

  const hasData = data.trim().length > 0;

  // Create the instance once (client-only import — qr-code-styling touches the DOM).
  useEffect(() => {
    let cancelled = false;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || qrRef.current) return;
      qrRef.current = new QRCodeStyling(toQrOptions(data, design, RENDER_SIZE));
      if (holderRef.current) {
        holderRef.current.innerHTML = "";
        qrRef.current.append(holderRef.current);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render whenever the data or design changes (debounced for typing).
  useEffect(() => {
    if (!ready || !qrRef.current) return;
    const id = setTimeout(() => {
      qrRef.current?.update(toQrOptions(data, design, RENDER_SIZE));
    }, 120);
    return () => clearTimeout(id);
  }, [data, design, ready]);

  async function download(format: Format) {
    const qr = qrRef.current;
    if (!qr || !hasData) return;
    setBusy(format);
    try {
      const blob = await buildBlob(qr, design, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `helavoice-qr.${format === "jpeg" ? "jpg" : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
        {copy.previewLabel}
      </div>

      <div className="relative mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center rounded-2xl bg-slate-50 p-3">
        <div
          ref={holderRef}
          aria-hidden={!hasData}
          className={cn(
            "w-full [&>canvas]:!h-auto [&>canvas]:!w-full [&>canvas]:rounded-xl",
            !hasData && "opacity-0"
          )}
        />
        {!hasData && (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-400">
            {copy.emptyHint}
          </p>
        )}
      </div>

      {design.caption.trim() && hasData && (
        <p
          className="mt-2 text-center text-sm font-bold uppercase tracking-wide"
          style={{ color: design.dotColor }}
        >
          {design.caption.trim()}
        </p>
      )}

      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold text-slate-500">
          {copy.downloadTitle}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["png", "jpeg", "svg"] as Format[]).map((f) => (
            <button
              key={f}
              type="button"
              disabled={!hasData || busy !== null}
              onClick={() => download(f)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                "bg-violet-600 text-white hover:bg-violet-700",
                "disabled:cursor-not-allowed disabled:opacity-40"
              )}
            >
              {busy === f ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {f === "jpeg" ? "JPG" : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Produce the downloadable file, compositing the caption when present. */
async function buildBlob(
  qr: QRCodeStyling,
  design: QrDesign,
  format: Format
): Promise<Blob> {
  const caption = design.caption.trim().toUpperCase();

  if (format === "svg") {
    const raw = (await qr.getRawData("svg")) as Blob;
    let svg = await raw.text();
    if (caption) svg = injectSvgCaption(svg, design, caption);
    return new Blob([svg], { type: "image/svg+xml" });
  }

  const pngBlob = (await qr.getRawData("png")) as Blob;
  if (!caption && format === "png") return pngBlob;

  const img = await blobToImage(pngBlob);
  const captionH = caption ? Math.round(img.height * 0.14) : 0;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height + captionH;
  const ctx = canvas.getContext("2d")!;

  // JPEG has no alpha, so it always needs an opaque background.
  const opaque = format === "jpeg" || !design.transparentBg;
  if (opaque) {
    ctx.fillStyle = design.transparentBg ? "#ffffff" : design.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  if (caption) {
    ctx.fillStyle = design.dotColor;
    ctx.font = `bold ${Math.round(captionH * 0.5)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(caption, canvas.width / 2, img.height + captionH / 2);
  }

  const mime = format === "jpeg" ? "image/jpeg" : "image/png";
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), mime, 0.92)
  );
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function escapeXml(s: string): string {
  return s.replace(
    /[<>&'"]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[c] as string
  );
}

function injectSvgCaption(
  svg: string,
  design: QrDesign,
  caption: string
): string {
  const w = parseFloat(svg.match(/width="([\d.]+)"/)?.[1] ?? "300");
  const h = parseFloat(svg.match(/height="([\d.]+)"/)?.[1] ?? "300");
  const capH = Math.round(h * 0.14);
  const newH = h + capH;
  const bg = design.transparentBg ? "none" : design.bgColor;
  const withBox = svg
    .replace(/height="[\d.]+"/, `height="${newH}"`)
    .replace(/viewBox="0 0 [\d.]+ [\d.]+"/, `viewBox="0 0 ${w} ${newH}"`);
  const rect = `<rect x="0" y="${h}" width="${w}" height="${capH}" fill="${bg}"/>`;
  const text = `<text x="${w / 2}" y="${
    h + capH * 0.62
  }" font-family="sans-serif" font-weight="bold" font-size="${Math.round(
    capH * 0.5
  )}" fill="${design.dotColor}" text-anchor="middle">${escapeXml(
    caption
  )}</text>`;
  return withBox.replace("</svg>", `${rect}${text}</svg>`);
}
