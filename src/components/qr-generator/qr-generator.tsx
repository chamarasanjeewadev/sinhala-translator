"use client";

import { useCallback, useState } from "react";
import { ContentForms, type ContentCopy } from "./content-forms";
import { DesignPanel, type DesignCopy } from "./design-panel";
import { QrPreview, type PreviewCopy } from "./qr-preview";
import { DEFAULT_DESIGN, type QrDesign } from "@/lib/qr-design";

export interface QrGeneratorCopy {
  content: ContentCopy;
  design: DesignCopy;
  preview: PreviewCopy;
}

export function QrGenerator({ copy }: { copy: QrGeneratorCopy }) {
  const [data, setData] = useState("");
  const [design, setDesign] = useState<QrDesign>(DEFAULT_DESIGN);

  const patchDesign = useCallback(
    (patch: Partial<QrDesign>) => setDesign((d) => ({ ...d, ...patch })),
    []
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      {/* Controls */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <ContentForms copy={copy.content} onDataChange={setData} />
        <div className="my-6 h-px bg-slate-100" />
        <DesignPanel design={design} onChange={patchDesign} copy={copy.design} />
      </div>

      {/* Sticky preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <QrPreview data={data} design={design} copy={copy.preview} />
      </div>
    </div>
  );
}
