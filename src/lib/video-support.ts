"use client";

export interface VideoCapabilities {
  /** WebCodecs decode+encode available — burned-in MP4 export possible */
  canExportVideo: boolean;
}

/**
 * Detect whether this browser can run the burned-in export pipeline
 * (WebCodecs). When false the editor still fully works — preview uses a
 * plain <video> element — but only SRT/VTT export is offered.
 */
export function getVideoCapabilities(): VideoCapabilities {
  const hasWebCodecs =
    typeof VideoDecoder !== "undefined" &&
    typeof VideoEncoder !== "undefined" &&
    typeof AudioDecoder !== "undefined";
  return { canExportVideo: hasWebCodecs };
}
