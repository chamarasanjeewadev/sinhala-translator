"use client";

import { useRef } from "react";
import { Grid2x2, Palette, ScanLine, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DOT_TYPES,
  CORNER_SQUARE_TYPES,
  CORNER_DOT_TYPES,
  ERROR_CORRECTION_LEVELS,
  type QrDesign,
} from "@/lib/qr-design";

export interface DesignCopy {
  styleTitle: string;
  dotsLabel: string;
  cornerSquareLabel: string;
  cornerDotLabel: string;
  colorsTitle: string;
  foreground: string;
  background: string;
  transparent: string;
  gradient: string;
  correctionTitle: string;
  correctionHint: string;
  logoTitle: string;
  logoHint: string;
  logoUpload: string;
  logoRemove: string;
  logoSize: string;
  captionTitle: string;
  captionPlaceholder: string;
  logoForcesHigh: string;
}

export function DesignPanel({
  design,
  onChange,
  copy,
}: {
  design: QrDesign;
  onChange: (patch: Partial<QrDesign>) => void;
  copy: DesignCopy;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      {/* QR style */}
      <Section icon={Grid2x2} title={copy.styleTitle}>
        <SwatchLabel>{copy.dotsLabel}</SwatchLabel>
        <PillGroup
          options={DOT_TYPES}
          value={design.dotType}
          onSelect={(v) => onChange({ dotType: v })}
        />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <SwatchLabel>{copy.cornerSquareLabel}</SwatchLabel>
            <PillGroup
              options={CORNER_SQUARE_TYPES}
              value={design.cornerSquareType}
              onSelect={(v) => onChange({ cornerSquareType: v })}
            />
          </div>
          <div>
            <SwatchLabel>{copy.cornerDotLabel}</SwatchLabel>
            <PillGroup
              options={CORNER_DOT_TYPES}
              value={design.cornerDotType}
              onSelect={(v) => onChange({ cornerDotType: v })}
            />
          </div>
        </div>
      </Section>

      {/* Colors */}
      <Section icon={Palette} title={copy.colorsTitle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorField
            label={copy.foreground}
            value={design.dotColor}
            onChange={(v) =>
              onChange({ dotColor: v, cornerSquareColor: v, cornerDotColor: v })
            }
          />
          <ColorField
            label={copy.background}
            value={design.bgColor}
            disabled={design.transparentBg}
            onChange={(v) => onChange({ bgColor: v })}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Toggle
            label={copy.gradient}
            checked={design.useDotGradient}
            onChange={(v) => onChange({ useDotGradient: v })}
          />
          <Toggle
            label={copy.transparent}
            checked={design.transparentBg}
            onChange={(v) => onChange({ transparentBg: v })}
          />
        </div>
        {design.useDotGradient && (
          <div className="mt-3 max-w-[calc(50%-0.5rem)]">
            <ColorField
              label="Gradient →"
              value={design.dotGradientColor}
              onChange={(v) => onChange({ dotGradientColor: v })}
            />
          </div>
        )}
      </Section>

      {/* Correction level */}
      <Section icon={ScanLine} title={copy.correctionTitle}>
        <p className="text-xs text-slate-500 mb-3">{copy.correctionHint}</p>
        <div className="grid grid-cols-4 gap-2">
          {ERROR_CORRECTION_LEVELS.map((lvl) => {
            const active = design.errorCorrection === lvl.value;
            const locked = !!design.logoDataUrl;
            return (
              <button
                key={lvl.value}
                type="button"
                disabled={locked}
                onClick={() => onChange({ errorCorrection: lvl.value })}
                className={cn(
                  "rounded-xl border px-2 py-2 text-center transition-colors",
                  active && !locked
                    ? "border-violet-500 bg-violet-50"
                    : "border-slate-200 hover:border-slate-300",
                  locked && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="text-sm font-semibold text-slate-900">
                  {lvl.label}
                </div>
                <div className="text-[11px] text-slate-500">{lvl.recovery}</div>
              </button>
            );
          })}
        </div>
        {design.logoDataUrl && (
          <p className="text-[11px] text-violet-600 mt-2">
            {copy.logoForcesHigh}
          </p>
        )}
      </Section>

      {/* Logo */}
      <Section icon={ImagePlus} title={copy.logoTitle}>
        <p className="text-xs text-slate-500 mb-3">{copy.logoHint}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleLogo}
        />
        {design.logoDataUrl ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={design.logoDataUrl}
              alt="logo preview"
              className="h-14 w-14 rounded-lg border border-slate-200 object-contain bg-white p-1"
            />
            <button
              type="button"
              onClick={() => onChange({ logoDataUrl: null })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" /> {copy.logoRemove}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-500 hover:border-violet-400 hover:text-violet-600"
          >
            <ImagePlus className="h-5 w-5" />
            {copy.logoUpload}
          </button>
        )}
        {design.logoDataUrl && (
          <div className="mt-4">
            <SwatchLabel>{copy.logoSize}</SwatchLabel>
            <input
              type="range"
              min={0.15}
              max={0.5}
              step={0.01}
              value={design.logoSize}
              onChange={(e) =>
                onChange({ logoSize: parseFloat(e.target.value) })
              }
              className="w-full accent-violet-600"
            />
          </div>
        )}
      </Section>

      {/* Caption */}
      <Section icon={ScanLine} title={copy.captionTitle}>
        <input
          type="text"
          maxLength={24}
          value={design.caption}
          onChange={(e) => onChange({ caption: e.target.value })}
          placeholder={copy.captionPlaceholder}
          className="h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs outline-none focus-visible:border-violet-500 focus-visible:ring-[3px] focus-visible:ring-violet-500/30"
        />
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Grid2x2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details open className="group rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3.5 text-sm font-semibold text-slate-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <Icon className="h-4 w-4" />
        </span>
        {title}
        <span className="ml-auto text-slate-400 transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="border-t border-slate-100 px-4 py-4">{children}</div>
    </details>
  );
}

function SwatchLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-medium text-slate-600">{children}</div>
  );
}

function PillGroup<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.value
              ? "border-violet-500 bg-violet-50 text-violet-700"
              : "border-slate-200 text-slate-600 hover:border-slate-300"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn(disabled && "opacity-50")}>
      <SwatchLabel>{label}</SwatchLabel>
      <div className="flex items-center gap-2 rounded-md border border-slate-300 px-2 py-1.5">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-700 uppercase outline-none"
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm text-slate-600"
    >
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-violet-600" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
            checked ? "left-[1.125rem]" : "left-0.5"
          )}
        />
      </span>
      {label}
    </button>
  );
}
