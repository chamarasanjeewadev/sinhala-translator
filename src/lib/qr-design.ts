import type {
  Options as QrOptions,
  DotType,
  CornerSquareType,
  CornerDotType,
  ErrorCorrectionLevel,
} from "qr-code-styling";

/**
 * Design state for the QR generator, plus the mapping into qr-code-styling's
 * Options object. Kept separate from the React components so the mapping is
 * easy to reason about and adjust.
 */
export interface QrDesign {
  dotType: DotType;
  dotColor: string;
  useDotGradient: boolean;
  dotGradientColor: string;
  bgColor: string;
  transparentBg: boolean;
  cornerSquareType: CornerSquareType;
  cornerSquareColor: string;
  cornerDotType: CornerDotType;
  cornerDotColor: string;
  errorCorrection: ErrorCorrectionLevel;
  logoDataUrl: string | null;
  logoSize: number; // 0.1 – 0.5, fraction of the QR occupied by the logo
  caption: string;
}

export const DEFAULT_DESIGN: QrDesign = {
  dotType: "rounded",
  dotColor: "#1a0b2e",
  useDotGradient: false,
  dotGradientColor: "#7c3aed",
  bgColor: "#ffffff",
  transparentBg: false,
  cornerSquareType: "extra-rounded",
  cornerSquareColor: "#5b21b6",
  cornerDotType: "dot",
  cornerDotColor: "#7c3aed",
  errorCorrection: "Q",
  logoDataUrl: null,
  logoSize: 0.35,
  caption: "",
};

export const DOT_TYPES: { value: DotType; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "dots", label: "Dots" },
  { value: "rounded", label: "Rounded" },
  { value: "extra-rounded", label: "Extra rounded" },
  { value: "classy", label: "Classy" },
  { value: "classy-rounded", label: "Classy rounded" },
];

export const CORNER_SQUARE_TYPES: { value: CornerSquareType; label: string }[] =
  [
    { value: "square", label: "Square" },
    { value: "dot", label: "Dot" },
    { value: "extra-rounded", label: "Rounded" },
  ];

export const CORNER_DOT_TYPES: { value: CornerDotType; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "dot", label: "Dot" },
];

export const ERROR_CORRECTION_LEVELS: {
  value: ErrorCorrectionLevel;
  label: string;
  recovery: string;
}[] = [
  { value: "L", label: "Low", recovery: "7%" },
  { value: "M", label: "Medium", recovery: "15%" },
  { value: "Q", label: "Quartile", recovery: "25%" },
  { value: "H", label: "High", recovery: "30%" },
];

/** Build qr-code-styling Options from our design state + encoded data. */
export function toQrOptions(
  data: string,
  design: QrDesign,
  size: number
): QrOptions {
  const gradient = design.useDotGradient
    ? {
        type: "linear" as const,
        rotation: Math.PI / 4,
        colorStops: [
          { offset: 0, color: design.dotColor },
          { offset: 1, color: design.dotGradientColor },
        ],
      }
    : undefined;

  // A center logo hides part of the code, so force high error correction
  // whenever a logo is present to keep it scannable.
  const errorCorrectionLevel: ErrorCorrectionLevel = design.logoDataUrl
    ? "H"
    : design.errorCorrection;

  return {
    width: size,
    height: size,
    type: "canvas",
    data: data || " ",
    margin: 8,
    image: design.logoDataUrl || undefined,
    qrOptions: { errorCorrectionLevel },
    imageOptions: {
      crossOrigin: "anonymous",
      margin: 4,
      imageSize: design.logoSize,
      hideBackgroundDots: true,
    },
    dotsOptions: {
      type: design.dotType,
      color: design.dotColor,
      gradient,
    },
    cornersSquareOptions: {
      type: design.cornerSquareType,
      color: design.cornerSquareColor,
    },
    cornersDotOptions: {
      type: design.cornerDotType,
      color: design.cornerDotColor,
    },
    backgroundOptions: {
      color: design.transparentBg ? "transparent" : design.bgColor,
    },
  };
}
