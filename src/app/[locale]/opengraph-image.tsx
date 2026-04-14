import { ImageResponse } from "next/og";
import { locales, type Locale } from "@/lib/i18n/config";
// locales/Locale used for locale validation below
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default async function Image({
  params,
}: {
  params: { locale: string };
}) {
  const locale = locales.includes(params.locale as Locale)
    ? (params.locale as Locale)
    : "en";
  const dict = await getDictionary(locale);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #340075 0%, #4c1d95 50%, #0051d5 100%)",
          fontFamily: "sans-serif",
          padding: 80,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            border: "2px solid rgba(255,255,255,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 3,
              alignItems: "flex-end",
              height: 40,
            }}
          >
            {[60, 90, 45, 100, 55, 80, 35, 70].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: `${h}%`,
                  background: "white",
                  borderRadius: 3,
                }}
              />
            ))}
          </div>
        </div>

        {/* Site name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: "white",
            letterSpacing: -1,
            marginBottom: 20,
          }}
        >
          HelaVoice.lk
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: "rgba(255,255,255,0.80)",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
            marginBottom: 40,
          }}
        >
          {dict.metadata.description}
        </div>

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 100,
            padding: "12px 28px",
            border: "1.5px solid rgba(255,255,255,0.25)",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#4ade80",
            }}
          />
          <span style={{ color: "white", fontSize: 20, fontWeight: 600 }}>
            AI-Powered Sinhala Transcription
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
