# Support Page + Global Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/support` page that emails submissions to `hi@helavoice.lk` via Brevo, and render the existing footer (plus a Support link) on every page.

**Architecture:** Extract the landing page's inline footer into `src/components/footer.tsx` and render it once in the `[locale]` layout. Add a new `/support` route (server page + client form) posting to a new public API route `src/app/api/support/route.ts`, which validates, applies honeypot/min-time spam checks, and sends via Brevo's transactional API (`POST https://api.brevo.com/v3/smtp/email`).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 + shadcn/ui (Button/Input/Label in `src/components/ui/`), custom JSON-dictionary i18n (`en`/`si`), Brevo REST API, Cloudflare Workers via OpenNext.

## Global Constraints

- **This directory is NOT a git repository.** Skip all commit steps; verification is `yarn lint` + `yarn build` (no test framework exists in this project — do not add one).
- Working directory for all commands: `/Users/chami/Documents/projects/hela-voice/hela-voice-web`.
- Support inbox: `hi@helavoice.lk`. Brevo sender: `no-reply@helavoice.lk` (name "HelaVoice"). Secret name: `BREVO_API_KEY`.
- All user-facing strings must exist in BOTH `src/lib/i18n/dictionaries/en.json` and `si.json`. Dictionary type is `Record<string, any>` — no type changes needed.
- i18n URL scheme: `en` is unprefixed, `si` prefixed. Use `localePath(path, locale)` from `@/lib/i18n/utils` for links, `generateAlternates(locale, path)` for page metadata.
- API responses must use `privateJson()` from `@/lib/api-response` (sets no-store headers).
- No new dependencies. Brevo is called with plain `fetch` (Workers-compatible).
- Field length caps: name ≤ 200, email ≤ 320, subject ≤ 300, message ≤ 5000. Min submit time: 3000 ms. Honeypot field name: `website`.

---

### Task 1: Global Footer component

**Files:**
- Create: `src/components/footer.tsx`
- Modify: `src/app/[locale]/layout.tsx` (render Footer)
- Modify: `src/app/[locale]/page.tsx` (remove inline footer, lines ~687–813, and the now-unused `AudioWaveform` import)
- Modify: `src/lib/i18n/dictionaries/en.json`, `src/lib/i18n/dictionaries/si.json` (add `landing.footerSupport`)

**Interfaces:**
- Produces: `Footer({ locale, dict }: { locale: Locale; dict: Record<string, any> })` — server component exported from `@/components/footer`, rendered only by the locale layout.

- [ ] **Step 1: Add dictionary keys**

In `src/lib/i18n/dictionaries/en.json`, inside the `landing` object after `"footerTerms": "Terms",` add:

```json
    "footerSupport": "Support",
```

In `src/lib/i18n/dictionaries/si.json`, inside `landing` after `"footerTerms": "කොන්දේසි",` add:

```json
    "footerSupport": "සහාය",
```

- [ ] **Step 2: Create `src/components/footer.tsx`**

The markup below is the footer currently inlined in `src/app/[locale]/page.tsx:687-813`, unchanged except: (a) it's wrapped in a component taking `locale`/`dict` props, and (b) a Support link is added to the Legal column between Privacy and Terms links (after the Terms `<li>`).

```tsx
import Link from "next/link";
import { AudioWaveform } from "lucide-react";
import { localePath } from "@/lib/i18n/utils";
import type { Locale } from "@/lib/i18n/config";

type FooterProps = {
  locale: Locale;
  dict: Record<string, any>;
};

export function Footer({ locale, dict }: FooterProps) {
  const d = dict.landing;
  const lp = (path: string) => localePath(path, locale);

  return (
    <footer className="border-t border-white/8 bg-[#07000f] px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4c0095] to-[#7c3aed] shadow-[0_4px_12px_rgba(124,58,237,0.35)]">
                <AudioWaveform className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-white">
                HelaVoice.lk
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#a99fc4]">
              {d.footerDesc}
            </p>
            <p className="mt-4 text-sm font-medium text-[#a99fc4]">
              {d.footerContact}{" "}
              <a
                href="mailto:hi@helavoice.lk"
                className="text-violet-300 transition-colors hover:text-fuchsia-300"
              >
                hi@helavoice.lk
              </a>
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="section-eyebrow mb-5 text-white/50">
              {d.footerProduct}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={lp("/#features")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerFeatures}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/blog")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerBlog}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/pricing")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerPricing}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="section-eyebrow mb-5 text-white/50">
              {d.footerAccount}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={lp("/login")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerLogIn}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/signup")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerSignUp}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/dashboard")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerDashboard}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="section-eyebrow mb-5 text-white/50">
              {d.footerLegal}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={lp("/privacy")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerPrivacy}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/terms")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerTerms}
                </Link>
              </li>
              <li>
                <Link
                  href={lp("/support")}
                  className="text-sm font-medium text-[#a99fc4] transition-colors hover:text-white"
                >
                  {d.footerSupport}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 md:flex-row">
          <p className="text-sm font-medium text-[#a99fc4]/70">
            {d.footerCopyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Render Footer in the locale layout**

In `src/app/[locale]/layout.tsx`, add the import:

```tsx
import { Footer } from "@/components/footer";
```

and change the JSX body of `LocaleLayout` to render it after the transitions wrapper:

```tsx
  return (
    <LocaleProvider locale={locale as Locale}>
      <DictionaryProvider dictionary={dict}>
        <Navbar />
        <ViewTransitions>
          <main>{children}</main>
        </ViewTransitions>
        <Footer locale={locale as Locale} dict={dict} />
        <Toaster />
      </DictionaryProvider>
    </LocaleProvider>
  );
```

- [ ] **Step 4: Remove the inline footer from the landing page**

In `src/app/[locale]/page.tsx`, delete the entire block from the comment `{/* ── Footer ────────────────────────────────────────────────────── */}` through the closing `</footer>` (currently lines 687–813). The file should end with:

```tsx
      </section>
    </div>
  );
}
```

Then remove `AudioWaveform,` from the `lucide-react` import at the top (it was only used in the footer — verify with `grep -n AudioWaveform "src/app/[locale]/page.tsx"` returning no matches after the edit).

- [ ] **Step 5: Verify**

Run: `yarn lint`
Expected: no errors (warnings that already existed are fine).

Run: `yarn build`
Expected: build succeeds; `/[locale]` and other routes compile.

---

### Task 2: Support API route (Brevo send)

**Files:**
- Create: `src/app/api/support/route.ts`
- Modify: `.env.example` (document `BREVO_API_KEY`)

**Interfaces:**
- Consumes: `privateJson` from `@/lib/api-response`; `createClient` from `@/lib/supabase/server`.
- Produces: `POST /api/support` accepting JSON `{ name: string; email: string; subject: string; message: string; website?: string; elapsedMs?: number }`. Responses: `200 {"success": true}`, `400 {"error": string}`, `502 {"error": string}`. Task 3's form posts exactly this shape.

- [ ] **Step 1: Create `src/app/api/support/route.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import { privateJson } from "@/lib/api-response";

const SUPPORT_INBOX = "hi@helavoice.lk";
const SENDER = { name: "HelaVoice", email: "no-reply@helavoice.lk" };
const LIMITS = { name: 200, email: 320, subject: 300, message: 5000 };
const MIN_ELAPSED_MS = 3000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    website?: string;
    elapsedMs?: number;
  };

  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot: bots fill the hidden "website" field. Pretend success so they
  // don't learn the field is a trap.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return privateJson({ success: true });
  }

  // Bot friction: humans take longer than 3s from page load to submit.
  if (typeof body.elapsedMs !== "number" || body.elapsedMs < MIN_ELAPSED_MS) {
    return privateJson({ error: "Submission rejected" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!name || !email || !subject || !message) {
    return privateJson({ error: "All fields are required" }, { status: 400 });
  }

  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    subject.length > LIMITS.subject ||
    message.length > LIMITS.message
  ) {
    return privateJson({ error: "A field exceeds its maximum length" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return privateJson({ error: "Invalid email address" }, { status: 400 });
  }

  // Best-effort context: if the visitor is logged in, include their account
  // details so support can link the message to the user. Never required.
  let userContext = "";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userContext = `<p><strong>Logged-in user:</strong> ${escapeHtml(user.id)} (${escapeHtml(user.email ?? "no email")})</p>`;
    }
  } catch {
    // Anonymous submission — fine.
  }

  const htmlContent = [
    `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>`,
    `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>`,
    userContext,
    `<hr />`,
    `<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
  ].join("\n");

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    // Local dev without the secret: log instead of sending so the form flow
    // stays testable end-to-end.
    console.log("[support] BREVO_API_KEY not set — would send:", {
      name,
      email,
      subject,
      messageLength: message.length,
    });
    return privateJson({ success: true });
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: SUPPORT_INBOX, name: "HelaVoice Support" }],
      replyTo: { email, name },
      subject: `[Support] ${subject}`,
      htmlContent,
    }),
  });

  if (!res.ok) {
    console.error("[support] Brevo send failed:", res.status, await res.text());
    return privateJson({ error: "Failed to send message" }, { status: 502 });
  }

  return privateJson({ success: true });
}
```

- [ ] **Step 2: Document the secret in `.env.example`**

Append to `.env.example`:

```bash

# Brevo transactional email (support form). Set in production via:
#   wrangler secret put BREVO_API_KEY
# When unset in dev, support submissions are logged instead of sent.
BREVO_API_KEY=
```

- [ ] **Step 3: Verify the route in isolation**

Run: `yarn dev` (background), then:

```bash
# Honeypot filled → fake success
curl -s -X POST localhost:3000/api/support -H 'content-type: application/json' \
  -d '{"name":"a","email":"a@b.co","subject":"s","message":"m","website":"spam","elapsedMs":9999}'
# Expected: {"success":true}

# Too fast → rejected
curl -s -X POST localhost:3000/api/support -H 'content-type: application/json' \
  -d '{"name":"a","email":"a@b.co","subject":"s","message":"m","elapsedMs":100}'
# Expected: {"error":"Submission rejected"}

# Bad email → rejected
curl -s -X POST localhost:3000/api/support -H 'content-type: application/json' \
  -d '{"name":"a","email":"not-an-email","subject":"s","message":"m","elapsedMs":9999}'
# Expected: {"error":"Invalid email address"}

# Valid (no BREVO_API_KEY in dev) → success + server log line
curl -s -X POST localhost:3000/api/support -H 'content-type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","subject":"Hello","message":"Hi there","elapsedMs":9999}'
# Expected: {"success":true} and "[support] BREVO_API_KEY not set — would send: ..." in dev server log
```

Stop the dev server afterwards.

---

### Task 3: Support page + form

**Files:**
- Create: `src/app/[locale]/support/page.tsx`
- Create: `src/components/support-form.tsx`
- Modify: `src/lib/i18n/dictionaries/en.json`, `src/lib/i18n/dictionaries/si.json` (new top-level `support` section)

**Interfaces:**
- Consumes: `POST /api/support` from Task 2 (JSON `{ name, email, subject, message, website, elapsedMs }`); `useDictionary()` from `@/lib/i18n/dictionary-context`; shadcn `Button`, `Input`, `Label` from `@/components/ui/*`.
- Produces: public route `/support` (en) and `/si/support`, target of the footer's Support link from Task 1.

- [ ] **Step 1: Add the `support` dictionary section**

In `src/lib/i18n/dictionaries/en.json`, add a new top-level key (sibling of `"pricing"`, `"dashboard"`, etc.):

```json
  "support": {
    "metaTitle": "Support",
    "metaDescription": "Contact the HelaVoice team. We usually reply within one business day.",
    "title": "Contact support",
    "subtitle": "Have a question or ran into a problem? Send us a message and we'll reply to your email, usually within one business day.",
    "nameLabel": "Your name",
    "emailLabel": "Your email",
    "subjectLabel": "Subject",
    "messageLabel": "Message",
    "submit": "Send message",
    "sending": "Sending…",
    "successTitle": "Message sent",
    "successBody": "Thanks for reaching out. We'll reply to your email address, usually within one business day.",
    "sendAnother": "Send another message",
    "errorValidation": "Please fill in every field and use a valid email address.",
    "errorGeneric": "Your message could not be sent. Please try again, or email us directly at"
  }
```

In `src/lib/i18n/dictionaries/si.json`, add the translated section in the same position:

```json
  "support": {
    "metaTitle": "සහාය",
    "metaDescription": "HelaVoice කණ්ඩායම අමතන්න. සාමාන්‍යයෙන් එක් ව්‍යාපාරික දිනක් ඇතුළත පිළිතුරු දෙන්නෙමු.",
    "title": "සහාය සඳහා අමතන්න",
    "subtitle": "ප්‍රශ්නයක් හෝ ගැටලුවක් තිබේද? අපට පණිවිඩයක් එවන්න — සාමාන්‍යයෙන් එක් ව්‍යාපාරික දිනක් ඇතුළත ඔබගේ විද්‍යුත් තැපෑලට පිළිතුරු දෙන්නෙමු.",
    "nameLabel": "ඔබගේ නම",
    "emailLabel": "ඔබගේ විද්‍යුත් තැපෑල",
    "subjectLabel": "මාතෘකාව",
    "messageLabel": "පණිවිඩය",
    "submit": "පණිවිඩය යවන්න",
    "sending": "යවමින්…",
    "successTitle": "පණිවිඩය යවන ලදී",
    "successBody": "අප හා සම්බන්ධ වීම ගැන ස්තූතියි. සාමාන්‍යයෙන් එක් ව්‍යාපාරික දිනක් ඇතුළත ඔබගේ විද්‍යුත් තැපෑලට පිළිතුරු දෙන්නෙමු.",
    "sendAnother": "තවත් පණිවිඩයක් යවන්න",
    "errorValidation": "කරුණාකර සියලුම ක්ෂේත්‍ර පුරවා වලංගු විද්‍යුත් තැපැල් ලිපිනයක් භාවිතා කරන්න.",
    "errorGeneric": "ඔබගේ පණිවිඩය යැවීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න, නැතහොත් අපට කෙලින්ම ලියන්න:"
  }
```

- [ ] **Step 2: Create `src/components/support-form.tsx`**

Client component following the `auth-form.tsx` conventions (`useDictionary`, shadcn primitives). The message field is a native `<textarea>` styled to match `Input` (no Textarea primitive exists in this project — do not add one).

```tsx
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useDictionary } from "@/lib/i18n/dictionary-context";

const SUPPORT_INBOX = "hi@helavoice.lk";

export function SupportForm() {
  const dict = useDictionary();
  const d = dict.support;

  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const loadedAt = useRef(Date.now());

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      subject: String(data.get("subject") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
      website: String(data.get("website") ?? ""),
      elapsedMs: Date.now() - loadedAt.current,
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      setError(d.errorValidation);
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("idle");
      setError(d.errorGeneric);
    }
  };

  if (status === "sent") {
    return (
      <Card>
        <CardHeader>
          <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-500" />
          <CardTitle>{d.successTitle}</CardTitle>
          <CardDescription>{d.successBody}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setStatus("idle")}>
            {d.sendAnother}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot — hidden from humans, bots fill it and get silently dropped */}
          <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="support-name">{d.nameLabel}</Label>
              <Input id="support-name" name="name" maxLength={200} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">{d.emailLabel}</Label>
              <Input id="support-email" name="email" type="email" maxLength={320} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-subject">{d.subjectLabel}</Label>
            <Input id="support-subject" name="subject" maxLength={300} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-message">{d.messageLabel}</Label>
            <textarea
              id="support-message"
              name="message"
              maxLength={5000}
              required
              rows={6}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}{" "}
              <a href={`mailto:${SUPPORT_INBOX}`} className="font-medium underline">
                {SUPPORT_INBOX}
              </a>
            </p>
          )}

          <Button type="submit" disabled={status === "sending"} className="w-full sm:w-auto">
            {status === "sending" ? d.sending : d.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

Note: the honeypot wrapper needs `relative` positioning context to be irrelevant — it uses `absolute -left-[9999px]`, which positions relative to the nearest positioned ancestor or viewport; either way it is off-screen. Keep as written.

- [ ] **Step 3: Create `src/app/[locale]/support/page.tsx`**

Follows the privacy page pattern (`generateStaticParams`, locale guard, `generateAlternates`) with the legal pages' light visual style:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateAlternates } from "@/lib/i18n/utils";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { SupportForm } from "@/components/support-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = await getDictionary(locale as Locale);

  return {
    title: `${dict.support.metaTitle} | HelaVoice`,
    description: dict.support.metaDescription,
    alternates: generateAlternates(locale as Locale, "/support"),
  };
}

export default async function SupportPage({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const dict = await getDictionary(locale as Locale);

  return (
    <div className="min-h-screen bg-[#faf8ff]">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <h1 className="mb-3 font-sans text-3xl font-bold text-[#111c2d] md:text-4xl">
          {dict.support.title}
        </h1>
        <p className="mb-10 font-sans text-base leading-relaxed text-[#4a4452]">
          {dict.support.subtitle}
        </p>
        <SupportForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `yarn lint`
Expected: no new errors.

Run: `yarn dev` (background), open `http://localhost:3000/support` and `http://localhost:3000/si/support`:
- Form renders with localized labels; footer from Task 1 visible below.
- Submitting with all fields (waiting >3 s) shows the success card; dev server logs the `[support] BREVO_API_KEY not set` line.
- Submitting again via "Send another message" works.

Stop the dev server afterwards.

---

### Task 4: Sitemap + final verification

**Files:**
- Modify: `src/app/sitemap.ts`

**Interfaces:**
- Consumes: `/support` route from Task 3.

- [ ] **Step 1: Add `/support` to the sitemap**

In `src/app/sitemap.ts`, add to the `staticRoutes` array after the `/terms` entry:

```ts
    { path: '/support',        priority: 0.5, changeFrequency: 'monthly' },
```

- [ ] **Step 2: Full verification**

Run: `yarn lint`
Expected: passes.

Run: `yarn build`
Expected: succeeds, `/[locale]/support` appears in the route list.

Run: `yarn dev` (background) and spot-check the footer renders on: `/`, `/pricing`, `/blog`, `/privacy`, `/terms`, `/login`, `/signup`, `/support` (dashboard requires login — verify if a session is available). Check `http://localhost:3000/sitemap.xml` contains `/support` and `/si/support`. Stop the dev server.

---

## Deployment notes (manual, post-merge)

1. In the Brevo dashboard, ensure `no-reply@helavoice.lk` is a **verified sender** (Senders & IPs → Senders). If the verified sender differs, update `SENDER` in `src/app/api/support/route.ts`.
2. Create a Brevo API key (SMTP & API → API keys) and set it: `wrangler secret put BREVO_API_KEY`.
3. Deploy with `yarn deploy`.
4. Submit the production form once and confirm the email arrives at `hi@helavoice.lk` with reply-to set to the submitter.
