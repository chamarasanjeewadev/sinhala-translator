# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SinhalaScribe — a SaaS web app for transcribing Sinhala audio to text using Google Cloud Speech-to-Text API. Users authenticate, get 30 free credits on signup (1 credit = 1 minute of audio), and can purchase more via Stripe. Deployed to Cloudflare Workers via OpenNext.

## Commands

- `yarn dev` — Start Next.js dev server (localhost:3000)
- `yarn build` — Build for production
- `yarn lint` — Run ESLint
- `yarn preview` — Build and preview on local Cloudflare runtime
- `yarn deploy` — Build and deploy to Cloudflare Workers
- `yarn cf-typegen` — Regenerate Cloudflare env type definitions

## Architecture

**Stack:** Next.js 16 (App Router) + React 19, Supabase (auth + Postgres), Stripe (payments), Google Cloud Speech-to-Text / Gemini API (transcription), Cloudflare Workers (hosting via OpenNext).

**UI:** shadcn/ui (new-york style) with Tailwind CSS v4, Lucide icons, Sonner for toasts. Components live in `src/components/ui/` (shadcn primitives) and `src/components/` (app-specific).

### Routing and i18n

All pages live under `src/app/[locale]/`. Supported locales: `en` (default), `si` (Sinhala), configured in `src/lib/i18n/config.ts`.

**URL scheme:** Default locale (`en`) has no prefix — `/dashboard` not `/en/dashboard`. Middleware (`src/middleware.ts`) rewrites unprefixed paths to `/en/...` internally and redirects `/en/...` URLs to `/...`. Non-default locales keep their prefix (`/si/dashboard`).

**Dictionary system:** JSON dictionaries in `src/lib/i18n/dictionaries/{en,si}.json`. Loaded via `getDictionary()` in the `[locale]` layout and provided to the component tree through `DictionaryProvider` (React context). Dictionary type is `Record<string, any>` — adding new i18n keys doesn't require type changes.

**Layout hierarchy:** Root layout (`src/app/layout.tsx`) sets fonts and `force-dynamic`. Locale layout (`src/app/[locale]/layout.tsx`) wraps pages in `LocaleProvider`, `DictionaryProvider`, `<Navbar />`, and `<Toaster />`, using `next-view-transitions` for page transitions.

### Key flows

**Auth:** Supabase email auth with PKCE flow. `src/lib/supabase/middleware.ts` handles session refresh + route protection in Next.js middleware. Protected routes (`/dashboard`, `/pricing`) redirect to `/login`; auth routes (`/login`, `/signup`) redirect authenticated users to `/dashboard`. The `/auth/callback` route exchanges the code for a session. A Postgres trigger (`handle_new_user`) auto-creates a profile with 30 free credits on signup.

**Transcription (chunked, duration-based billing):**
1. Client records/uploads audio → detects duration via Web Audio API → calls `/api/transcribe/analyze` to get cost estimate
2. User confirms → client chunks audio into 60s WAV segments (16kHz mono) via `chunkAudio()` in `src/lib/audio-utils.ts`
3. For each chunk: client POSTs to `/api/transcribe/chunk` → server atomically deducts 1 credit via `deduct_credit` RPC → calls configured transcription provider (Gemini or Google Speech-to-Text) → returns transcript text
4. After all chunks (or on insufficient credits): client POSTs to `/api/transcribe/save` to persist the transcript
5. 1 credit = 1 minute of audio (ceil). Provider is configurable via `TRANSCRIPTION_PROVIDER` env var (defaults to Gemini). Gemini uses `@google/generative-ai` SDK; Speech-to-Text uses REST API (no gRPC, compatible with Cloudflare Workers).

**Credits & Payments:** `/api/stripe/checkout` creates a Stripe Checkout session for a credit package (defined in `src/lib/constants.ts`). `/api/stripe/webhook` handles `checkout.session.completed` events and calls the `add_credits` RPC (idempotent via `stripe_session_id`). The webhook route is excluded from middleware auth via the matcher pattern.

### Blog

MDX blog posts in `src/content/blog/`. Parsed by `src/lib/blog.ts` using `gray-matter` for frontmatter (title, date, excerpt, image, author, categories, keywords). Pages at `/blog` (list) and `/blog/[slug]` (detail). Custom MDX components in `src/components/mdx-components.tsx`. Blog routes are included in `src/app/sitemap.ts`.

### Supabase clients

Four Supabase client factories in `src/lib/supabase/`:
- `client.ts` — Browser client (client components)
- `server.ts` — Server client with cookie-based auth (Server Components, Route Handlers)
- `middleware.ts` — Middleware client for session refresh
- `admin.ts` — Service role client (webhook handler, bypasses RLS)

### Database

Schema is in `supabase-migration.sql`. Tables: `profiles` (user credits), `credit_transactions` (audit log), `transcriptions` (saved transcripts with `credits_used` and `is_partial` flags). Two RPC functions: `deduct_credit` (atomic, row-locked) and `add_credits` (idempotent). RLS is enabled on all tables.

### Cloudflare deployment

Uses `@opennextjs/cloudflare` to run Next.js on Cloudflare Workers. Config in `wrangler.jsonc`. Public env vars go in `wrangler.jsonc` `vars`; secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLOUD_API_KEY`) must be set via `wrangler secret put`. The Stripe client uses `createFetchHttpClient()` and `createSubtleCryptoProvider()` for Cloudflare Workers compatibility. No gRPC or native binaries — use REST APIs via `fetch()`.

### Environment variables

See `.env.example` for required vars. `NEXT_PUBLIC_*` vars are exposed to the browser. Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLOUD_API_KEY`.

Transcription provider is configured via `TRANSCRIPTION_PROVIDER` (defaults to `gemini`; set to `speech-to-text` for Google Speech-to-Text API). Gemini model can be customized via `GEMINI_MODEL` (defaults to `gemini-1.5-flash`).

## SEO

`src/app/robots.ts` and `src/app/sitemap.ts` generate robots.txt and sitemap.xml. The sitemap includes all static routes and blog posts for each locale. Open Graph and Twitter metadata are generated per-locale in the `[locale]` layout's `generateMetadata`.
