import { headers } from "next/headers";
import Script from "next/script";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});



const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HelaVoice",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://helavoice.lk",
  logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://helavoice.lk"}/logo.jpeg`,
  description:
    "HelaVoice.lk — AI-powered Sinhala audio transcription tool for Sri Lankan creators, students, journalists, and businesses.",
  sameAs: [],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="zES6ra/Qx8xmfraBbT8TYw"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} ${jetBrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
