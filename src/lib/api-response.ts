import { NextResponse } from "next/server";

// Responses carrying per-user data must never be cached by the browser,
// proxies, or the Cloudflare edge — a cached response could be served to a
// different user (cross-account data leak).
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  Vary: "Cookie, Authorization",
} as const;

export function privateJson<T>(data: T, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init);
  for (const [key, value] of Object.entries(PRIVATE_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}
