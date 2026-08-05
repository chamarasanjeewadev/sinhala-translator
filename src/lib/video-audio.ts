"use client";

import { TARGET_SAMPLE_RATE, CHUNK_DURATION_SECONDS } from "./constants";
import { chunkAudio, encodeWav } from "./audio-utils";
import type { AudioChunk } from "./types";

/**
 * Extract the audio track of a local video file as 120s mono 16 kHz WAV
 * chunks, ready for the /api/subtitles/chunk endpoint.
 *
 * Primary path streams the file with mediabunny (WebCodecs) so a 500 MB video
 * never has to be materialized in memory: native-rate samples are accumulated
 * per chunk (~20 MB for 120 s of 48 kHz mono) and resampled to 16 kHz with an
 * OfflineAudioContext. Fallback path is the existing chunkAudio(), which
 * decodes the whole file at once via decodeAudioData — fine on desktop, risky
 * for large files, but better than failing on browsers without WebCodecs.
 */
export async function extractAudioChunks(file: File): Promise<AudioChunk[]> {
  try {
    const chunks = await extractWithMediabunny(file);
    if (chunks.length > 0) return chunks;
  } catch (err) {
    console.warn(
      "Streaming audio extraction failed, falling back to decodeAudioData:",
      err
    );
  }
  return chunkAudio(file);
}

/** Get a video file's duration in seconds without decoding it fully */
export function getVideoDuration(source: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    });
    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    });
    video.src = url;
  });
}

async function extractWithMediabunny(file: File): Promise<AudioChunk[]> {
  const { Input, BlobSource, AudioSampleSink, ALL_FORMATS } = await import(
    "mediabunny"
  );

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) {
      throw new Error("Video has no audio track");
    }

    const sink = new AudioSampleSink(track);
    const chunks: AudioChunk[] = [];

    // Mono samples at the track's native rate for the chunk being built
    let pending: Float32Array[] = [];
    let pendingFrames = 0;
    let nativeRate = 0;
    let index = 0;

    const flush = async () => {
      if (pendingFrames === 0 || nativeRate === 0) return;
      const mono = new Float32Array(pendingFrames);
      let offset = 0;
      for (const part of pending) {
        mono.set(part, offset);
        offset += part.length;
      }
      pending = [];
      pendingFrames = 0;

      const wavBlob = await resampleToWav(mono, nativeRate);
      chunks.push({
        blob: wavBlob,
        durationSec: mono.length / nativeRate,
        index,
      });
      index++;
    };

    for await (const sample of sink.samples()) {
      try {
        const buffer = sample.toAudioBuffer();
        nativeRate = buffer.sampleRate;

        // Downmix to mono
        const mono = new Float32Array(buffer.length);
        const numChannels = buffer.numberOfChannels;
        for (let ch = 0; ch < numChannels; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            mono[i] += data[i] / numChannels;
          }
        }
        pending.push(mono);
        pendingFrames += mono.length;

        if (pendingFrames >= CHUNK_DURATION_SECONDS * nativeRate) {
          await flush();
        }
      } finally {
        sample.close();
      }
    }
    await flush();

    return chunks;
  } finally {
    input.dispose();
  }
}

async function resampleToWav(
  mono: Float32Array,
  nativeRate: number
): Promise<Blob> {
  if (nativeRate === TARGET_SAMPLE_RATE) {
    const ctx = new OfflineAudioContext(1, mono.length, TARGET_SAMPLE_RATE);
    const buffer = ctx.createBuffer(1, mono.length, TARGET_SAMPLE_RATE);
    buffer.getChannelData(0).set(mono);
    return encodeWav(buffer);
  }

  const targetLength = Math.ceil((mono.length * TARGET_SAMPLE_RATE) / nativeRate);
  const ctx = new OfflineAudioContext(1, targetLength, TARGET_SAMPLE_RATE);
  const source = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, mono.length, nativeRate);
  buffer.getChannelData(0).set(mono);
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  const rendered = await ctx.startRendering();
  return encodeWav(rendered);
}
