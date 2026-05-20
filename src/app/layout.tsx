import { headers } from "next/headers";
import Script from "next/script";
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

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HelaVoice",
  url: siteUrl,
  logo: `${siteUrl}/logo.jpeg`,
  description:
    "HelaVoice.lk — AI-powered Sinhala audio transcription tool for Sri Lankan creators, students, journalists, and businesses.",
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "HelaVoice.lk",
  alternateName: "Sinhala Voice Transcriber",
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
        {children}
      </body>
    </html>
  );
}
