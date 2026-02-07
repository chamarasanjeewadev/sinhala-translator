import { CreditPackage } from "./types";

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "pack_10",
    name: "Starter",
    credits: 60,
    price: 500,
    priceDisplay: "$5",
  },
  {
    id: "pack_50",
    name: "Popular",
    credits: 300,
    price: 2000,
    priceDisplay: "$20",
    popular: true,
  },
  {
    id: "pack_100",
    name: "Pro",
    credits: 700,
    price: 3000,
    priceDisplay: "$30",
  },
  {
    id: "pack_150",
    name: "Premium",
    credits: 1000,
    price: 5000,
    priceDisplay: "$50",
  },
];

export const FREE_CREDITS = 50;
export const CREDIT_PER_MINUTE = 1;
export const CHUNK_DURATION_SECONDS = 120; // 2 minutes per chunk - balance between performance and request size
export const TARGET_SAMPLE_RATE = 16000;
export const MAX_RETRIES = 2;
export const MAX_AUDIO_SIZE_MB = 25;
export const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;

export const SUPPORTED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp3",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
  "audio/x-m4a",
];

export const PROTECTED_ROUTES = ["/dashboard"];
export const AUTH_ROUTES = ["/login", "/signup"];
