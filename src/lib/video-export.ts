"use client";

import type { SubtitleSegment, SubtitleStyle } from "./types";
import { drawSubtitle, CANVAS_FONT_STACKS } from "./subtitle-style";

export interface ExportProgress {
  /** 0–1 */
  fraction: number;
}

/**
 * Render the video with subtitles burned in, entirely in the browser:
 * mediabunny streams frames out of the source file (WebCodecs decode), each
 * frame is composited with the styled subtitle on a canvas, re-encoded
 * (hardware-accelerated where available), and muxed into an MP4 together with
 * the original audio track (packet passthrough when the codec is MP4-
 * compatible, streaming AAC re-encode otherwise).
 */
export async function exportBurnedInMp4(
  file: File,
  segments: SubtitleSegment[],
  style: SubtitleStyle,
  onProgress: (progress: ExportProgress) => void,
  abortSignal: AbortSignal
): Promise<Blob> {
  const {
    Input,
    Output,
    BlobSource,
    BufferTarget,
    Mp4OutputFormat,
    VideoSampleSink,
    AudioSampleSink,
    EncodedPacketSink,
    EncodedAudioPacketSource,
    CanvasSource,
    AudioBufferSource,
    Quality,
    QUALITY_MEDIUM,
    canEncodeVideo,
    ALL_FORMATS,
  } = await import("mediabunny");

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });

  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error("Video has no video track");
    const audioTrack = await input.getPrimaryAudioTrack();
    const duration = await input.computeDuration();

    const width = videoTrack.displayWidth;
    const height = videoTrack.displayHeight;

    // Make sure subtitle glyphs (especially Sinhala) are ready before drawing
    const fontSize = Math.round((style.fontSizePct / 100) * height);
    try {
      await document.fonts.load(
        `${fontSize}px ${CANVAS_FONT_STACKS[style.fontFamily]}`,
        "අආඉ Ag"
      );
    } catch {
      // Non-fatal: canvas falls back to an available font
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    const format = new Mp4OutputFormat({ fastStart: false });
    const output = new Output({ format, target: new BufferTarget() });

    // Match the encoder to the source's actual bitrate so burn-in doesn't
    // balloon the file. Re-encoding every frame is unavoidable (the subtitle is
    // composited onto each frame), but a fixed high-quality preset ignores how
    // the source was encoded and can quadruple the size of an efficiently
    // encoded clip. Encoding at ~the source bitrate keeps output ≈ input.
    const MIN_BITRATE = 600_000; // floor: avoid garbage on tiny/bad estimates
    const MAX_BITRATE = 12_000_000; // ceiling: cap runaway estimates
    const sourceBitrate = await estimateSourceVideoBitrate(
      videoTrack,
      audioTrack,
      file.size,
      duration,
      width,
      height
    );
    // 1.1× headroom: the subtitle boxes are flat and compress well, so matching
    // the source is enough; the margin just avoids softening detail near text.
    const targetBitrate = Math.round(
      Math.min(Math.max(sourceBitrate * 1.1, MIN_BITRATE), MAX_BITRATE)
    );

    const videoCodec = (await canEncodeVideo("avc", { width, height }))
      ? ("avc" as const)
      : ("vp9" as const);
    const videoSource = new CanvasSource(canvas, {
      codec: videoCodec,
      quality: new Quality({ bitrate: targetBitrate }),
    });
    output.addVideoTrack(videoSource);

    // Audio: passthrough if the source codec fits in MP4, else re-encode AAC
    const supportedCodecs = format.getSupportedCodecs();
    const audioCodec = audioTrack?.codec ?? null;
    const passthroughAudio =
      audioTrack && audioCodec && supportedCodecs.includes(audioCodec);
    let packetSource: InstanceType<typeof EncodedAudioPacketSource> | null =
      null;
    let audioBufferSource: InstanceType<typeof AudioBufferSource> | null = null;

    if (audioTrack && passthroughAudio && audioCodec) {
      packetSource = new EncodedAudioPacketSource(audioCodec);
      output.addAudioTrack(packetSource);
    } else if (audioTrack) {
      audioBufferSource = new AudioBufferSource({
        codec: "aac",
        quality: QUALITY_MEDIUM,
      });
      output.addAudioTrack(audioBufferSource);
    }

    await output.start();

    // Feed audio and video concurrently; mediabunny interleaves internally
    // and its backpressure keeps memory bounded.
    const audioPromise = (async () => {
      if (!audioTrack) return;
      if (packetSource) {
        const sink = new EncodedPacketSink(audioTrack);
        const decoderConfig = await audioTrack.getDecoderConfig();
        let first = true;
        // AAC (and some other codecs) emit priming packets with small negative
        // timestamps (encoder delay). mediabunny rejects negative timestamps,
        // so shift every packet by the first packet's offset — this keeps the
        // packets monotonic (clamping to 0 would collide with the next packet)
        // and only delays audio by the priming duration (~20ms, imperceptible).
        let tsOffset = 0;
        for await (const packet of sink.packets()) {
          if (abortSignal.aborted) return;
          if (first && packet.timestamp < 0) {
            tsOffset = -packet.timestamp;
          }
          const adjusted =
            tsOffset > 0
              ? packet.clone({ timestamp: packet.timestamp + tsOffset })
              : packet;
          await packetSource.add(
            adjusted,
            first && decoderConfig ? { decoderConfig } : undefined
          );
          first = false;
        }
        packetSource.close();
      } else if (audioBufferSource) {
        const sink = new AudioSampleSink(audioTrack);
        for await (const sample of sink.samples()) {
          if (abortSignal.aborted) {
            sample.close();
            return;
          }
          const buffer = sample.toAudioBuffer();
          sample.close();
          await audioBufferSource.add(buffer);
        }
        audioBufferSource.close();
      }
    })();

    const videoPromise = (async () => {
      const sink = new VideoSampleSink(videoTrack);
      for await (const sample of sink.samples()) {
        if (abortSignal.aborted) {
          sample.close();
          return;
        }
        const timestamp = sample.timestamp;
        const frameDuration = sample.duration;
        sample.draw(ctx, 0, 0, width, height);
        sample.close();

        const active = segments.find(
          (s) => timestamp >= s.start && timestamp < s.end
        );
        if (active?.text) {
          drawSubtitle(ctx, style, active.text, width, height);
        }

        // Guard against a negative first-frame timestamp (same class of crash
        // as audio priming); the encoder requires non-negative timestamps.
        await videoSource.add(Math.max(0, timestamp), frameDuration);
        if (duration > 0) {
          onProgress({ fraction: Math.min(Math.max(0, timestamp) / duration, 1) });
        }
      }
      videoSource.close();
    })();

    await Promise.all([videoPromise, audioPromise]);

    if (abortSignal.aborted) {
      await output.cancel();
      throw new DOMException("Export cancelled", "AbortError");
    }

    await output.finalize();
    const buffer = (output.target as InstanceType<typeof BufferTarget>).buffer;
    if (!buffer) throw new Error("Export produced no data");
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    input.dispose();
  }
}

/** Minimal structural view of a mediabunny input track's bitrate accessor. */
interface BitrateSource {
  getAverageBitrate(): Promise<number | null>;
}

/**
 * Best-effort estimate of the source video track's bitrate in bits/sec, so the
 * burn-in encoder can target ~the same rate. Prefers the cheap metadata average;
 * falls back to (file size ÷ duration) minus audio; finally a resolution-based
 * default so the encoder is never handed 0.
 */
async function estimateSourceVideoBitrate(
  videoTrack: BitrateSource,
  audioTrack: BitrateSource | null,
  fileSize: number,
  durationSeconds: number,
  width: number,
  height: number
): Promise<number> {
  const metaBitrate = await videoTrack.getAverageBitrate().catch(() => null);
  if (metaBitrate && metaBitrate > 0) return metaBitrate;

  if (durationSeconds > 0) {
    const totalBps = (fileSize * 8) / durationSeconds;
    const audioBps = audioTrack
      ? (await audioTrack.getAverageBitrate().catch(() => null)) ?? 128_000
      : 0;
    const videoBps = totalBps - audioBps;
    if (videoBps > 0) return videoBps;
  }

  // Last resort: ~0.1 bits per pixel per second at 30fps.
  return Math.max(width * height * 30 * 0.1, 1_000_000);
}
