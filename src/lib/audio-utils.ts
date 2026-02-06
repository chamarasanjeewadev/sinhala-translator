"use client";

import { TARGET_SAMPLE_RATE, CHUNK_DURATION_SECONDS } from "./constants";
import type { AudioChunk } from "./types";

export function getAudioDuration(source: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const audio = new Audio();
    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load audio metadata"));
    });
    audio.src = url;
  });
}

export async function chunkAudio(
  source: Blob,
  chunkDurationSec: number = CHUNK_DURATION_SECONDS
): Promise<AudioChunk[]> {
  const arrayBuffer = await source.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  await audioContext.close();

  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = audioBuffer.length;
  const chunkSamples = chunkDurationSec * sampleRate;
  const chunks: AudioChunk[] = [];

  let offset = 0;
  let index = 0;

  while (offset < totalSamples) {
    const end = Math.min(offset + chunkSamples, totalSamples);
    const length = end - offset;

    // Downmix to mono
    const monoData = new Float32Array(length);
    const numChannels = audioBuffer.numberOfChannels;
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        monoData[i] += channelData[offset + i] / numChannels;
      }
    }

    // Create mono AudioBuffer for WAV encoding
    const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
    const chunkBuffer = offlineCtx.createBuffer(1, length, sampleRate);
    chunkBuffer.getChannelData(0).set(monoData);

    const wavBlob = encodeWav(chunkBuffer);
    const durationSec = length / sampleRate;

    chunks.push({ blob: wavBlob, durationSec, index });

    offset = end;
    index++;
  }

  return chunks;
}

function encodeWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0);
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * blockAlign;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCM samples (float32 → int16)
  let offsetBytes = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offsetBytes, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offsetBytes += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
