import { ArrowRight, AudioLines, Captions, Check, ChevronDown, Gift, Mic, ScanText } from "lucide-react";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { getSignupBonusConfig, getAudioUploadLimitMb } from "@/lib/app-settings";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { locales, type Locale } from "@/lib/i18n/config";
import { localePath, t, generateAlternates } from "@/lib/i18n/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PricingBuyButton } from "@/components/pricing-buy-button";
import { HeroSlider } from "@/components/home/hero-slider";
import { CHUNK_MINUTES, FREE_TOOLS, costNote } from "@/components/tool-catalog";
import "./home.css";
import { ogImages } from "@/lib/og-image";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);

  return {
    alternates: generateAlternates(locale as Locale, "/"),
    openGraph: {
      images: ogImages,
      url:
        locale === "en"
          ? "https://helavoice.lk"
          : `https://helavoice.lk/${locale}`,
    },
    title: dict.metadata.title,
    description: dict.metadata.description,
    keywords: [
      "sinhala voice to text",
      "sinhala transcribe",
      "convert sinhala voice to text",
      "sinhala transcript",
      "sinhala voice transcriber",
      "sinhala speech to text",
      "sinhala transcription",
      "sri lanka transcription",
      "voice note transcription sinhala",
    ],
  };
}

type Props = {
  params: Promise<{ locale: string }>;
};

// The product's own screen in the hero: a finished transcript, as the dashboard shows it.
const MOCK_LINES = [
  { at: "0:00", text: "ආයුබෝවන් සියලු දෙනාට." },
  { at: "0:06", text: "අද අපි නව නිෂ්පාදනය ගැන කතා කරමු." },
  { at: "0:14", text: "මේ මාසයේ ඇණවුම් දෙගුණයක් වැඩි වුණා." },
  { at: "0:21", text: "ඊළඟ සතියේ අලුත් ශාඛාවක් විවෘත කරනවා." },
];

const MOCK_SECONDS = 252; // 4:12, billed like a real upload

const MOCK_PARTS = (() => {
  // The recording cut the way the dashboard cuts it: one credit per started part.
  const part = CHUNK_MINUTES * 60;
  const parts: number[] = [];
  for (let left = MOCK_SECONDS; left > 0; left -= part) parts.push(Math.min(part, left));
  return parts;
})();

/** Bar heights for a clip, deterministic so server and client render the same. */
const bars = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => 22 + Math.round(Math.abs(Math.sin((i + seed) * 1.7) * 40 + Math.sin((i + seed) * 0.45) * 22)));

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const dict = await getDictionary(locale as Locale);
  const d = dict.landing;
  const [{ enabled: freeTier, amount: freeCredits }, maxMb] = await Promise.all([
    getSignupBonusConfig(),
    getAudioUploadLimitMb(),
  ]);

  const lp = (path: string) => localePath(path, locale as Locale);
  const guidePath = lp("/blog/how-to-transcribe-sinhala-audio-to-text");
  const primaryLabel = freeTier ? d.heroPrimaryFree : d.heroPrimary;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HelaVoice.lk",
    alternateName: ["Sinhala Voice to Text", "Sinhala Speech to Text", "Sinhala Voice Transcriber"],
    url: siteUrl,
    description: d.heroSubtitle,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "si"],
    featureList: [
      "Sinhala voice to text conversion",
      "Sinhala speech-to-text",
      "Audio file upload",
      "Browser-based recording",
      "Sinhala video subtitles",
      "Sinhala text to speech",
      "Pay-as-you-go credits, no subscription",
      "Bilingual UI (English & Sinhala)",
    ],
    audience: {
      "@type": "Audience",
      audienceType:
        "Sri Lankan creators, students, journalists, and businesses",
      geographicArea: { "@type": "Country", name: "Sri Lanka" },
    },
    offers: [
      ...(freeTier
        ? [
            {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: `${freeCredits} free credits on signup (up to ${freeCredits * CHUNK_MINUTES} minutes of transcription), no credit card required`,
            },
          ]
        : []),
      ...CREDIT_PACKAGES.map((pkg) => ({
        "@type": "Offer",
        name: pkg.name,
        price: (pkg.price / 100).toFixed(2),
        priceCurrency: "USD",
        description: `${pkg.credits} credits, up to ${pkg.credits * CHUNK_MINUTES} minutes of transcription`,
      })),
    ],
  };

  // Prices in FAQ answers come from CREDIT_PACKAGES, never from the copy.
  const starter = CREDIT_PACKAGES.reduce((a, b) => (b.price < a.price ? b : a));
  const faqVars = { starterPrice: starter.priceDisplay, starterCredits: starter.credits, chunkMin: CHUNK_MINUTES, maxMb };
  const faqItems = ((d.faqItems ?? []) as { q: string; a: string }[]).map((item) => ({ q: item.q, a: t(item.a, faqVars) }));
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const steps = (d.howSteps as { title: string; desc: string }[])
    .slice(0, 3)
    .map((step) => ({ ...step, desc: t(step.desc, { chunkMin: CHUNK_MINUTES, maxMb }) }));


  const nav = dict.navbar;
  const lane = (key: string) => ({ ["--c" as string]: `var(--lane-${key})` });
  const formatsIn = (d.formatsInItems as { dt: string; dd: string }[]).map((x) => ({ ...x, dd: t(x.dd, { mb: maxMb }) }));
  const formatsOut = d.formatsOutItems as { dt: string; dd: string }[];
  const starterMinutes = starter.credits * CHUNK_MINUTES;
  const rows = [
    ...(freeTier
      ? [{ id: "free", name: d.freeCardTitle as string, sub: d.freeCardNote as string, credits: freeCredits, price: "$0", popular: false }]
      : []),
    ...CREDIT_PACKAGES.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      sub: t(d.perCreditPrice, { price: (pkg.price / 100 / pkg.credits).toFixed(2) }),
      credits: pkg.credits,
      price: pkg.priceDisplay,
      popular: Boolean(pkg.popular),
    })),
  ];
  const tag = (cost: "free" | "trial" | "credits") => (
    <span className={`hv-tag hv-tag--${cost === "credits" ? "paid" : cost}`}>
      {cost === "free" ? nav.costFree : cost === "trial" ? nav.costTrial : nav.costCredits}
    </span>
  );

  return (
    <div className="hv-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqItems.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      {/* ── Hero: the recording above, its Sinhala text below ── */}
      <section className="hv-hero">
        <div className="container hv-hero__grid">
          <div className="hv-hero__copy">
            <h1>{d.h1}</h1>
            <p className="lead">{d.heroLead}</p>
            <div className="hv-hero__actions">
              <Link href={lp("/signup")} className="hv-btn hv-btn--primary">
                {primaryLabel}
                <ArrowRight aria-hidden width={18} height={18} />
              </Link>
              <a href="#tools" className="hv-btn hv-btn--sheet">
                {d.heroSecondary}
              </a>
            </div>
            <ul className="hv-facts">
              {[freeTier ? t(d.freeCredits, { count: freeCredits }) : null, t(d.heroFactRate, { chunkMin: CHUNK_MINUTES }), d.noSubscription]
                .filter((x): x is string => Boolean(x))
                .map((fact) => (
                  <li key={fact}>
                    <Check aria-hidden />
                    {fact}
                  </li>
                ))}
            </ul>
          </div>

          {/* Photos of the tools in use, each with the real product over it */}
          <HeroSlider
            labels={{
              region: d.sliderLabel,
              slideOf: d.slideOf,
              pause: d.sliderPause,
              play: d.sliderPlay,
              goTo: d.sliderGoTo,
            }}
            slides={[
              {
                key: "voice",
                href: lp("/sinhala-audio-to-text"),
                name: nav.transcribe,
                color: "var(--lane-voice)",
                image: "/images/hero/voice-2026-11.webp",
                card: (
                  <>
                    <span className="hv-lane" aria-hidden>
                      {MOCK_PARTS.map((sec, i) => (
                        <span key={i} className="hv-clip" style={{ flex: `${sec} 1 0`, minWidth: "4.5rem", ["--i" as string]: i }}>
                          <span className="hv-clip__fill">
                            {bars(Math.max(4, Math.round(sec / 6)), i * 7).map((h, j) => (
                              <i key={j} className="hv-clip__bar" style={{ height: `${h}%` }} />
                            ))}
                          </span>
                          <span className="hv-clip__credit">{d.mockCredit}</span>
                        </span>
                      ))}
                    </span>
                    <span className="hv-slide__line">
                      <time>{MOCK_LINES[0].at}</time>
                      <span className="sinhala">{MOCK_LINES[0].text}</span>
                    </span>
                    <span className="hv-slide__note">{costNote(nav, "transcribe")}</span>
                  </>
                ),
              },
              {
                key: "speech",
                href: lp("/sinhala-text-to-speech"),
                name: nav.textToSpeech,
                color: "var(--lane-speech)",
                image: "/images/hero/speech-2026-11.webp",
                card: (
                  <>
                    <span className="hv-lane" aria-hidden>
                      <span className="hv-clip" style={{ flex: "1 1 0" }}>
                        {bars(30, 11).map((h, j) => (
                          <i key={j} className="hv-clip__bar" style={{ height: `${h}%`, background: "var(--c)" }} />
                        ))}
                      </span>
                    </span>
                    <span className="sinhala">{MOCK_LINES[0].text}</span>
                    <span className="hv-slide__note">{costNote(nav, "textToSpeech")}</span>
                  </>
                ),
              },
              {
                key: "subs",
                href: lp("/subtitles"),
                name: nav.subtitles,
                color: "var(--lane-subs)",
                image: "/images/hero/subs-2026-11.webp",
                card: (
                  <>
                    <span className="hv-caption sinhala">{MOCK_LINES[1].text}</span>
                    <span className="hv-slide__note">{costNote(nav, "subtitles")}</span>
                  </>
                ),
              },
              {
                key: "scan",
                href: lp("/sinhala-scan-to-text"),
                name: nav.scanToText,
                color: "var(--lane-scan)",
                image: "/images/hero/scan-2026-11.webp",
                card: (
                  <>
                    <span className="sinhala">{MOCK_LINES[2].text}</span>
                    <span className="sinhala">{MOCK_LINES[3].text}</span>
                    <span className="hv-slide__note">{costNote(nav, "scanToText")}</span>
                  </>
                ),
              },
              {
                key: "translate",
                href: lp("/sinhala-to-english"),
                name: nav.translate,
                color: "var(--color-ink-2)",
                image: "/images/hero/notes-2026-11.webp",
                card: (
                  <>
                    <span className="sinhala">{MOCK_LINES[0].text}</span>
                    <span className="hv-slide__en">{d.mockEnglish}</span>
                    <span className="hv-slide__note">{costNote(nav, "translate")}</span>
                  </>
                ),
              },
            ]}
          />
        </div>
      </section>

      {/* ── Formats: what goes in, what comes out ── */}
      <section className="hv-section hv-band-night">
        <div className="container">
          <div className="hv-head">
            <h2>{d.formatsTitle}</h2>
            <p className="lead">{d.formatsLead}</p>
          </div>
          <div className="hv-io">
            {[
              { title: d.formatsIn as string, items: formatsIn },
              { title: d.formatsOut as string, items: formatsOut },
            ].map((col) => (
              <div key={col.title} className="hv-io__col">
                <h3>{col.title}</h3>
                <dl>
                  {col.items.map((item) => (
                    <div key={item.dt} className="hv-io__row">
                      <dt>{item.dt}</dt>
                      <dd>{item.dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tools: every tool in the logo's colours, with what it costs ── */}
      <section id="tools" className="hv-section--gap" style={{ scrollMarginTop: "4rem" }}>
        <div className="container">
          <div className="hv-head">
            <h2>{d.toolsTitle}</h2>
            <p className="lead">{d.toolsLead}</p>
          </div>
          <div className="hv-bento">
            <Link href={lp("/sinhala-audio-to-text")} className="hv-tile hv-tile--lead" style={lane("voice")}>
              <div className="hv-tile__top">
                <span className="hv-tile__swatch"><Mic aria-hidden /></span>
                {tag("credits")}
              </div>
              <h3>{nav.transcribe}</h3>
              <p className="hv-tile__note">{costNote(nav, "transcribe")}</p>
              <div className="hv-tile__visual hv-lane" aria-hidden>
                {MOCK_PARTS.map((sec, i) => (
                  <div key={i} className="hv-clip" style={{ flex: `${sec} 1 0`, minWidth: "3.5rem", height: 48 }}>
                    <span className="hv-clip__fill" style={{ animation: "none" }}>
                      {bars(Math.max(4, Math.round(sec / 6)), i * 5 + 3).map((h, j) => (
                        <i key={j} className="hv-clip__bar" style={{ height: `${h}%` }} />
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </Link>

            <Link href={lp("/sinhala-text-to-speech")} className="hv-tile hv-tile--wide" style={lane("speech")}>
              <div className="hv-tile__top">
                <span className="hv-tile__swatch"><AudioLines aria-hidden /></span>
                {tag("trial")}
              </div>
              <h3>{nav.textToSpeech}</h3>
              <p className="hv-tile__note">{costNote(nav, "textToSpeech")}</p>
              <div className="hv-tile__visual hv-lane" aria-hidden>
                <div className="hv-clip" style={{ flex: "1 1 0", height: 48 }}>
                  {bars(26, 11).map((h, j) => (
                    <i key={j} className="hv-clip__bar" style={{ height: `${h}%`, background: "var(--c)" }} />
                  ))}
                </div>
              </div>
            </Link>

            <Link href={lp("/subtitles")} className="hv-tile hv-tile--third" style={lane("subs")}>
              <div className="hv-tile__top">
                <span className="hv-tile__swatch"><Captions aria-hidden /></span>
                {tag("credits")}
              </div>
              <h3>{nav.subtitles}</h3>
              <p className="hv-tile__note">{costNote(nav, "subtitles")}</p>
              <div className="hv-tile__visual hv-captions" aria-hidden>
                <span className="hv-caption sinhala">{MOCK_LINES[1].text}</span>
              </div>
            </Link>

            <Link href={lp("/sinhala-scan-to-text")} className="hv-tile hv-tile--third" style={lane("scan")}>
              <div className="hv-tile__top">
                <span className="hv-tile__swatch"><ScanText aria-hidden /></span>
                {tag("trial")}
              </div>
              <h3>{nav.scanToText}</h3>
              <p className="hv-tile__note">{costNote(nav, "scanToText")}</p>
              <div className="hv-tile__visual hv-page" aria-hidden>
                {[92, 78, 86, 60].map((w) => (
                  <i key={w} style={{ width: `${w}%` }} />
                ))}
              </div>
            </Link>

            <div className="hv-tile hv-tile--third" style={{ ["--c" as string]: "var(--color-mint)" }}>
              <div className="hv-tile__top">
                <span className="hv-tile__swatch"><Gift aria-hidden /></span>
                {tag("free")}
              </div>
              <h3>{nav.freeGroup}</h3>
              <ul className="hv-free">
                {FREE_TOOLS.map((tool) => (
                  <li key={tool.key}>
                    <Link href={lp(tool.href)} className="hv-free__link">
                      <span>{nav[tool.key]}</span>
                      <span className="hv-free__cost">{costNote(nav, tool.key)}</span>
                    </Link>
                    {tool.key === "translate" && (
                      <Link href={lp("/sinhala-to-english")} className="hv-link hv-free__extra">
                        {d.toolsSiEn}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="hv-note">{d.toolsTranslateNote}</p>
        </div>
      </section>

      {/* ── How transcription works: the real three steps ── */}
      <section id="how-it-works" className="hv-section" style={{ scrollMarginTop: "4rem" }}>
        <div className="container">
          <div className="hv-head hv-head--stack">
            <h2>{d.howHeading}</h2>
          </div>
          <ol className="hv-steps">
            {steps.map((step, i) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                <div className="hv-steps__visual" aria-hidden>
                  {i === 0 && ["MP3", "M4A", "WAV", "OGG"].map((f) => <span key={f} className="hv-chip">{f}</span>)}
                  {i === 1 && (
                    <span className="hv-mini-lane">
                      {MOCK_PARTS.map((sec, k) => (
                        <span key={k} style={{ flex: `${sec} 1 0`, minWidth: "3.5rem" }}>{d.mockCredit}</span>
                      ))}
                    </span>
                  )}
                  {i === 2 && ["PDF", "Word", "TXT", "Markdown"].map((f) => <span key={f} className="hv-chip">{f}</span>)}
                </div>
              </li>
            ))}
          </ol>
          <p className="hv-note">
            {d.audioPageIntro}{" "}
            <Link href={lp("/sinhala-audio-to-text")} className="hv-link">
              {d.audioPageLink}
            </Link>
          </p>
        </div>
      </section>

      {/* ── Prices: the Starter pack as a figure, then every pack ── */}
      <section id="credits" className="hv-section--gap" style={{ scrollMarginTop: "4rem" }}>
        <div className="container">
          <div className="hv-head">
            <h2>{d.pricesTitle}</h2>
            <p className="lead">{d.pricesLead}</p>
          </div>
          <div className="hv-prices">
          <div>
            <p className="hv-stat__figure">
              <span className="hv-stat__num">{starterMinutes}</span>
              <span className="hv-stat__unit">{d.statUnit}</span>
            </p>
            <p className="hv-stat__line">{t(d.statLine, { price: starter.priceDisplay, pack: starter.name })}</p>
          </div>
          <div>
            <table className="hv-table">
              <thead>
                <tr>
                  <th scope="col">{d.thPack}</th>
                  <th scope="col">{d.thCredits}</th>
                  <th scope="col">{d.thTranscription}</th>
                  <th scope="col">{d.thPrice}</th>
                  <td aria-hidden />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={row.popular ? "is-popular" : undefined}>
                    <td>
                      <span className="hv-pack">{row.name}</span>
                      {row.popular && <> <span className="hv-tag hv-tag--paid">{d.mostPopular}</span></>}
                      <span className="hv-sub">{row.sub}</span>
                    </td>
                    <td className="num" data-label={d.thCredits}>{row.credits}</td>
                    <td className="num" data-label={d.thTranscription}>{t(d.cellMinutes, { min: row.credits * CHUNK_MINUTES })}</td>
                    <td className="num" data-label={d.thPrice}><strong>{row.price}</strong></td>
                    <td>
                      {row.id === "free" ? (
                        <Link href={lp("/signup")} className="hv-btn hv-btn--sheet hv-btn--small">
                          {d.startFree}
                        </Link>
                      ) : (
                        <PricingBuyButton
                          packageId={row.id}
                          label={t(d.buyPack, { count: row.credits })}
                          className="hv-btn hv-btn--sheet hv-btn--small"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="hv-facts hv-facts--prices">
              {[d.creditsNeverExpire, d.allTools, t(d.upToMb, { mb: maxMb }), d.allAudioFormats].map((x: string) => (
                <li key={x}>
                  <Check aria-hidden />
                  {x.charAt(0).toUpperCase() + x.slice(1)}
                </li>
              ))}
            </ul>
          </div>
          </div>
        </div>
      </section>

      {/* ── Questions as rows ── */}
      {faqItems.length > 0 ? (
        <section id="faq" className="hv-section" style={{ scrollMarginTop: "4rem" }}>
          <div className="container hv-faq">
            <div>
              <h2>{d.faqHeading}</h2>
              <p className="lead" style={{ marginTop: "var(--space-md)" }}>{d.faqSubtitle}</p>
            </div>
            <div className="hv-faq__list">
              {faqItems.map((item) => (
                <details key={item.q}>
                  <summary>
                    <h3>{item.q}</h3>
                    <ChevronDown aria-hidden />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Close: the hero's action again ── */}
      <section className="hv-close">
        <div className="container hv-close__grid">
          <div>
            <h2>{freeTier ? d.closeTitleFree : d.closeTitle}</h2>
            <p>{freeTier ? t(d.closeLeadFree, { count: freeCredits }) : d.closeLead}</p>
            <small>
              {d.guideIntro}{" "}
              <Link href={guidePath} className="hv-close__guide">
                {d.guideLink}
              </Link>
            </small>
          </div>
          <Link href={lp("/signup")} className="hv-btn hv-btn--sheet">
            {primaryLabel}
            <ArrowRight aria-hidden width={18} height={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
