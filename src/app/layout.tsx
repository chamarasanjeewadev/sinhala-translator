import { headers } from "next/headers";
import Script from "next/script";
import { GoogleTagManager } from "@next/third-parties/google";
import {
  Inter,
  JetBrains_Mono,
  Noto_Sans_Sinhala,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const notoSansSinhala = Noto_Sans_Sinhala({
  variable: "--font-noto-sinhala",
  subsets: ["sinhala"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});



const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://helavoice.lk";
const googleTagManagerId =
  process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || "GTM-P85D892K";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HelaVoice",
  url: siteUrl,
  logo: `${siteUrl}/logo.jpeg`,
  description:
    "HelaVoice.lk — AI-powered Sinhala audio transcription tool for Sri Lankan creators, students, journalists, and businesses.",
  sameAs: ["https://grittech.lk"],
  parentOrganization: {
    "@type": "Organization",
    name: "GritTech",
    url: "https://grittech.lk",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "HelaVoice.lk",
  alternateName: ["Sinhala Voice to Text", "Sinhala Voice Transcriber"],
  url: siteUrl,
  inLanguage: ["en", "si"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const locale = headersList.get("x-locale") || "en";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <Script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="zES6ra/Qx8xmfraBbT8TYw"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} ${notoSansSinhala.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
            height="0"
            width="0"
            title="Google Tag Manager"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <GoogleTagManager gtmId={googleTagManagerId} />
      </body>
    </html>
  );
}
