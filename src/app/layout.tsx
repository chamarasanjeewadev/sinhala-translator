import { headers } from "next/headers";
import Script from "next/script";
import { GoogleTagManager } from "@next/third-parties/google";
import { SignupTracker } from "@/components/signup-tracker";
import { JetBrains_Mono, Noto_Sans_Sinhala, Poppins } from "next/font/google";
import "./globals.css";
import { SUPPORT_EMAIL, whatsappLink } from "@/lib/contact";

// Poppins is the brand face (logo pack 2026-11): 400 body, 600 controls, 700 heads;
// 500 because 24 older files use font-medium and would otherwise render at 400.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
  logo: `${siteUrl}/logo.png`,
  description:
    "HelaVoice.lk — AI-powered Sinhala audio transcription tool for Sri Lankan creators, students, journalists, and businesses.",
  sameAs: ["https://grittech.lk"],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: SUPPORT_EMAIL,
    url: whatsappLink(),
    availableLanguage: ["English", "Sinhala"],
  },
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
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
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
        className={`${poppins.variable} ${notoSansSinhala.variable} ${jetBrainsMono.variable} antialiased`}
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
        <SignupTracker />
        <GoogleTagManager gtmId={googleTagManagerId} />
      </body>
    </html>
  );
}
