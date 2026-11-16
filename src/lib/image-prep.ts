export const SCAN_IMAGE_MAX_EDGE = 2000;
export const SCAN_IMAGE_JPEG_QUALITY = 0.85;

export function fitWithin(w: number, h: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    // Strip the "data:...;base64," prefix.
    reader.onload = () => resolve((reader.result as string).split(",", 2)[1] ?? "");
    reader.readAsDataURL(blob);
  });
}

// JPEG has no alpha: paint white first so transparent PNG/WebP don't flatten to black.
function draw(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
}

export async function prepareImage(
  file: File,
): Promise<{ base64: string; mimeType: "image/jpeg"; previewUrl: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("UNSUPPORTED_IMAGE");
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, SCAN_IMAGE_MAX_EDGE);
    let blob: Blob;
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      draw(canvas.getContext("2d")!, bitmap, width, height);
      blob = await canvas.convertToBlob({ type: "image/jpeg", quality: SCAN_IMAGE_JPEG_QUALITY });
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      draw(canvas.getContext("2d")!, bitmap, width, height);
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("UNSUPPORTED_IMAGE"))),
          "image/jpeg",
          SCAN_IMAGE_JPEG_QUALITY,
        ),
      );
    }
    return {
      base64: await blobToBase64(blob),
      mimeType: "image/jpeg",
      previewUrl: URL.createObjectURL(blob),
    };
  } finally {
    bitmap.close();
  }
}
