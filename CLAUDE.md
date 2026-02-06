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

**Stack:** Next.js 16 (App Router) + React 19, Supabase (auth + Postgres), Stripe (payments), Google Cloud Speech- API (transcription), Cloudflare Workers (hosting via OpenNext).

**UI:** shadcn/ui (new-york style) with Tailwind CSS v4, Lucide icons, Sonner for toasts. Components live in `src/components/ui/` (shadcn primitives) and `src/components/` (app-specific).

### Key flows

**Auth:** Supabase email auth with PKCE flow. `src/lib/supabase/middleware.ts` handles session refresh + route protection in Next.js middleware. Protected routes (`/dashboard`, `/pricing`) redirect to `/login`; auth routes (`/login`, `/signup`) redirect authenticated users to `/dashboard`. The `/auth/callback` route exchanges the code for a session. A Postgres trigger (`handle_new_user`) auto-creates a profile with 30 free credits on signup.

**Transcription (chunked, duration-based billing):**
1. Client records/uploads audio → detects duration via Web Audio API → calls `/api/transcribe/analyze` to get cost estimate
2. User confirms → client chunks audio into 60s WAV segments (16kHz mono) via `chunkAudio()` in `src/lib/audio-utils.ts`
3. For each chunk: client POSTs to `/api/transcribe/chunk` → server atomically deducts 1 credit via `deduct_credit` RPC → calls configured transcription provider (Gemini or Google Speech-to-Text) → returns transcript text
4. After all chunks (or on insufficient credits): client POSTs to `/api/transcribe/save` to persist the transcript
5. 1 credit = 1 minute of audio (ceil). Provider is configurable via `TRANSCRIPTION_PROVIDER` env var (defaults to Gemini). Gemini uses `@google/generative-ai` SDK; Speech-to-Text uses REST API (no gRPC, compatible with Cloudflare Workers).


**Credits & Payments:** `/api/stripe/checkout` creates a Stripe Checkout session for a credit package (defined in `src/lib/constants.ts`). `/api/stripe/webhook` handles `checkout.session.completed` events and calls the `add_credits` RPC (idempotent via `stripe_session_id`). The webhook route is excluded from middleware auth via the matcher pattern.

### Supabase clients

Four Supabase client factories in `src/lib/supabase/`:
- `client.ts` — Browser client (client components)
- `server.ts` — Server client with cookie-based auth (Server Components, Route Handlers)
- `middleware.ts` — Middleware client for session refresh
- `admin.ts` — Service role client (webhook handler, bypasses RLS)

### Database

Schema is in `supabase-migration.sql`. Tables: `profiles` (user credits), `credit_transactions` (audit log), `transcriptions` (saved transcripts with `credits_used` and `is_partial` flags). Two RPC functions: `deduct_credit` (atomic, row-locked) and `add_credits` (idempotent). RLS is enabled on all tables.

### Cloudflare deployment

Uses `@opennextjs/cloudflare` to run Next.js on Cloudflare Workers. Config in `wrangler.jsonc`. Public env vars go in `wrangler.jsonc` `vars`; secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLOUD_API_KEY`) must be set via `wrangler secret put`. The Stripe client uses `createFetchHttpClient()` and `createSubtleCryptoProvider()` for Cloudflare Workers compatibility.

### Environment variables

See `.env.example` for required vars. `NEXT_PUBLIC_*` vars are exposed to the browser. Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLOUD_API_KEY`. 

Transcription provider is configured via `TRANSCRIPTION_PROVIDER` (defaults to `gemini`; set to `speech-to-text` for Google Speech-to-Text API). Gemini model can be customized via `GEMINI_MODEL` (defaults to `gemini-1.5-flash`).

## Layout convention

Root layout (`src/app/layout.tsx`) sets `export const dynamic = "force-dynamic"` — all pages are dynamically rendered. The layout includes `<Navbar />` and `<Toaster />` globally. Dashboard page uses `<Suspense>` wrapping a client component that reads search params.
