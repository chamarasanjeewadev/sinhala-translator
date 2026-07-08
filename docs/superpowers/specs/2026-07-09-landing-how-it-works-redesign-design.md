# Landing page: "How it works" + unified dark editorial redesign

**Date:** 2026-07-09
**Surface:** `hela-voice-web` marketing landing page (`src/app/[locale]/page.tsx`), locales `en` + `si`.

## Goal

1. Add a numbered, arrowed **"How it works"** step-by-step section directly after the hero, so a customer immediately understands the flow (record/upload → AI transcribes → get text).
2. Rework the rest of the landing page so it reads as **human-crafted, not templated/AI-generated**, by carrying the hero's existing dark identity through the whole page.

## Problem (why the current page reads as "AI-generated")

The hero (`landing-hero.tsx`) is genuinely distinctive: dark aubergine/violet, an animated Sinhala live-transcription card, a bilingual ticker, JetBrains-mono stats. Everything below it (`page.tsx`) drops into generic light-lavender SaaS:

- Every section header is the identical pattern: `Title1` + `<br/>` + purple-gradient `Title2` (repeated 4×).
- The same gradient `#340075→#4c1d95` is applied to nearly every heading, icon, and card.
- Every card is the same `rounded-2xl` + same shadow; every section is centered with the same `py-28`.
- Decorative floating chips ("Lightning fast", "Sinhala optimized") are filler.
- `JetBrains Mono` (`--font-mono`) is loaded but unused in the body.

## Design tokens

**Palette** (all already present in the hero — reused, not invented):
- `ink` `#07000f` — base background
- `void` `#0d0020` / `#130030` — section gradient stops
- `violet` `#7c3aed` — primary accent
- `orchid` `#e879f9` — highlight, used sparingly
- `haze` `#a99fc4` — muted lavender-grey body text on dark
- `mist` `#f4f2fb` — the single warm light band (pricing), so prices pop

**Type roles:**
- Display: Plus Jakarta Sans (`--font-display`) — heavy weight, tight tracking, large editorial sizes.
- Body: Inter (`--font-sans`).
- Utility/data: **JetBrains Mono** (`--font-mono`) — eyebrows, step numbers, stat/data labels. This mono utility layer is a key "human designer" signal.
- Sinhala: Noto Sans Sinhala (`--font-sinhala`) used as a **display material** (real script as accent), since Sinhala speech is the product.

**Structure rules:**
- No two section headers use the same construction. Replace the repeated gradient-title pattern with mono uppercase eyebrows + varied, mostly left-aligned display headlines. Gradient text appears at most once.
- Numbered markers (`01/02/03`) only in "How it works", where order is real information.

## Signature element

The **voice→text throughline**: a thin waveform/gradient hairline (CSS, echoing the hero's wave bars) that (a) connects the How-it-works steps as the "arrow" and (b) reappears as a section divider. It literally depicts sound becoming text — meaningful, not decorative.

## Layout / section rhythm (unified dark editorial)

```
HERO            dark  (unchanged)
~ divider ~     waveform hairline
HOW IT WORKS    dark  (NEW)
FEATURES        dark
FAQ             dark
PRICING         light band (mist) — prices pop
CTA             dark
FOOTER          dark
```

## "How it works" content (3 real steps)

1. **Record or upload** — Record a Sinhala voice note in the browser, or upload an audio file. (icon: `Mic`)
2. **AI transcribes** — Gemini-powered Sinhala speech-to-text converts it, billed per minute. (icon: `Sparkles`)
3. **Get your text** — Read, edit, copy, or download accurate Sinhala text. (icon: `FileText`)

Desktop: 3 cards in a row joined by the waveform connector + `ArrowRight`. Mobile: stacked with `ArrowDown` connectors. Static render, no client JS.

## Components & files

- **NEW** `src/components/how-it-works.tsx` — dark server component, presentational, copy passed in from the dictionary (same pattern as `<LandingHero>`).
- `src/app/[locale]/page.tsx` — insert `<HowItWorks>` after `<LandingHero>`; restyle demo/features/faq/pricing/cta/footer sections to the dark editorial system. Pricing keeps its `CREDIT_PACKAGES` mapping + popular-tier logic; only presentation changes.
- `src/app/globals.css` — add reusable classes: mono section eyebrow, waveform divider, step connector, dark card surface; ensure visible keyboard focus and `prefers-reduced-motion` handling.
- `src/lib/i18n/dictionaries/{en,si}.json` — add a `landing.howItWorks` block (`title`, `eyebrow`, `subtitle`, `steps[3] {title, desc}`) and any new eyebrow keys, with Sinhala translations.

## Constraints

- No new dependencies. Static render; no new client components unless required.
- Preserve all existing behavior: JSON-LD blocks, FAQ `<details>`, pricing links, i18n keys, `sinhala-text` class usage.
- Quality floor: responsive to mobile, visible focus states, reduced-motion respected.

## Verification

- `yarn lint` passes clean.
- Dev server visual check at `/` and `/si`, desktop + mobile widths: How-it-works renders after hero with horizontal arrows (desktop) / vertical arrows (mobile); all sections read as one cohesive dark identity; pricing light band intact; no broken i18n keys.

## Notes

- Repo is not version-controlled, so the design doc is not committed to git.
