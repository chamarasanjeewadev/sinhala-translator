export type ClientPlatform = "android-app" | "ios-app" | "web-mobile" | "web-desktop" | "other";

/**
 * Which client made an API request, read from its User-Agent. Shipped app
 * builds send no custom header, so this is inferred: React Native fetch is
 * okhttp on Android and "<App>/<build> CFNetwork Darwin" on iOS; every
 * browser sends "Mozilla/5.0".
 */
export function clientPlatform(userAgent: string | null): ClientPlatform {
  const ua = userAgent ?? "";
  if (/okhttp/i.test(ua)) return "android-app";
  if (/Mozilla/i.test(ua)) return /Mobi|Android|iPhone|iPad/i.test(ua) ? "web-mobile" : "web-desktop";
  if (/CFNetwork|Darwin/i.test(ua)) return "ios-app";
  return "other";
}
