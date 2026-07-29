# Support Page + Global Footer — Design

Date: 2026-07-13
Status: Approved

## Goal

1. A public support page that emails submissions to `hi@helavoice.lk` via Brevo.
2. A shared footer (with Privacy, Terms, and Support links) on every page of the web app.

## Context

- App: `hela-voice-web` — Next.js 16 App Router, i18n via `[locale]` segment (`en` default unprefixed, `si` prefixed), deployed to Cloudflare Workers via OpenNext.
- A full footer currently exists only inline in the landing page (`src/app/[locale]/page.tsx`) and already contains Privacy/Terms links and the `hi@helavoice.lk` contact line.
- No email-sending capability exists anywhere in the codebase. The user already uses Brevo for email campaigns, so Brevo's transactional API is the delivery mechanism.

## Decisions (user-confirmed)

- **Delivery:** Brevo transactional email API (`POST https://api.brevo.com/v3/smtp/email`), authenticated with `api-key` header from a `BREVO_API_KEY` secret. Fetch-based, Workers-compatible.
- **Access:** Public — anyone can submit (visitors, locked-out users). Spam protection required.
- **Footer scope:** Every page, rendered once in the `[locale]` layout.
- **Approach:** Direct send only (no Supabase persistence). If Brevo fails, the user sees an error with a `mailto:hi@helavoice.lk` fallback. A support-requests table can be added later if needed.

## Components

### 1. Support page — `src/app/[locale]/support/page.tsx`

- Server component with per-locale `generateMetadata` (title/description from dictionaries), following the pattern of existing pages.
- Renders a client component `src/components/support-form.tsx`: fields for name, email, subject, message; submit button; success state ("message sent" confirmation replacing the form); error state with mailto fallback link.
- Visual style matches the existing dark landing/legal pages.
- All user-facing strings from new keys in `src/lib/i18n/dictionaries/{en,si}.json`.
- Route is public: middleware only protects `/dashboard` and `/pricing`, so no middleware change needed.
- Added to `src/app/sitemap.ts` for both locales.

### 2. Spam protection (in the form + API)

- Hidden honeypot field: if filled, the API returns a fake success without sending.
- Minimum-time check: the form records load time; submissions completing faster than ~3 seconds are rejected as bots.
- No CAPTCHA or KV rate-limiting (YAGNI — add later if abuse occurs).

### 3. API route — `src/app/api/support/route.ts`

- `POST`, no auth required.
- Validation: name/email/subject/message present where required, email format check, length caps (e.g. name ≤ 200, subject ≤ 300, message ≤ 5000 chars).
- Sends via Brevo:
  - `to`: `hi@helavoice.lk`
  - `sender`: `no-reply@helavoice.lk` (must be a verified sender in the Brevo account)
  - `replyTo`: submitter's address, so replies from the mailbox go straight back to them
  - Body: plain-text-style HTML with the submitted fields.
- If a Supabase session exists on the request, append the user's id and account email to the body for context (best-effort; do not require auth).
- If `BREVO_API_KEY` is unset (local dev), log the payload and return success so the flow is testable without sending.
- Brevo error → 502 with a generic error; client shows the mailto fallback.

### 4. Global footer — `src/components/footer.tsx`

- Extract the existing landing-page footer markup verbatim into a `Footer` component (server-compatible, dictionary-driven).
- Remove the inline footer from `src/app/[locale]/page.tsx`.
- Render `<Footer />` in `src/app/[locale]/layout.tsx` after `<main>{children}</main>` so every page (landing, pricing, blog, privacy/terms, login/signup, dashboard, support) gets it.
- Add a "Support" link to the footer (Legal column, alongside Privacy and Terms) with new `footerSupport` dictionary keys.
- No visual redesign.

## Config

- New secret: `BREVO_API_KEY` — set via `wrangler secret put BREVO_API_KEY` for production and `.env.local` for dev; document in `.env.example`.

## Error handling summary

| Failure | Behavior |
|---|---|
| Validation error | 400 with field-level message; form shows inline error |
| Honeypot filled / too-fast submit | Fake success (200) / 400 respectively; no email sent |
| Brevo API error or timeout | 502; form shows error + mailto:hi@helavoice.lk fallback |
| Missing `BREVO_API_KEY` in dev | Log payload, return success |

## Testing

- `yarn lint` and `yarn build` pass.
- Manual dev-flow verification: submit the form (dev mode logs payload), success and error states render, honeypot path returns fake success.
- Footer visible on landing, pricing, blog, legal, auth, dashboard, and support pages in both locales.
- `/support` present in sitemap for both locales.

## Out of scope

- Support-request persistence in Supabase / admin app view.
- CAPTCHA or rate limiting beyond honeypot + time check.
- Mobile app changes.
