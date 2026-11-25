import { describe, expect, it } from "vitest";
import { clientPlatform } from "../client-platform";

describe("clientPlatform", () => {
  it.each([
    ["okhttp/4.12.0", "android-app"],
    ["HelaVoice/12 CFNetwork/1568.100.1 Darwin/24.0.0", "ios-app"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148", "web-mobile"],
    ["Mozilla/5.0 (Linux; Android 14; SM-A156E) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36", "web-mobile"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", "web-desktop"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36", "web-desktop"],
    ["curl/8.7.1", "other"],
    [null, "other"],
  ])("%s -> %s", (ua, expected) => {
    expect(clientPlatform(ua)).toBe(expected);
  });
});
