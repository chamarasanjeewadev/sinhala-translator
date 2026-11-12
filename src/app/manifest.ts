import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HelaVoice — Sinhala Voice to Text",
    short_name: "HelaVoice",
    description:
      "Convert Sinhala voice to text with AI. Record or upload audio and transcribe Sinhala speech into accurate text in seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f7f2",
    theme_color: "#2f7d5b",
    lang: "en",
    icons: [
      { src: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      {
        src: "/icon-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
    ],
  };
}
