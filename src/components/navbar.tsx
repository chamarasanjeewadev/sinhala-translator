"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { CreditBalance } from "@/components/credit-balance";
import { LocaleLink } from "@/components/locale-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath, parsePathname } from "@/lib/i18n/utils";
import { createClient } from "@/lib/supabase/client";
import type { User, SupabaseClient } from "@supabase/supabase-js";

function NewBadge({ label }: { label: string }) {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-white shadow-[0_0_10px_rgba(239,68,68,0.7)] animate-pulse">
      {label}
    </span>
  );
}

export const TOOL_LINKS = [
  { href: "/singlish-to-sinhala", key: "singlishTool", isNew: true },
  { href: "/english-to-sinhala", key: "translate", isNew: true },
  { href: "/sinhala-text-to-speech", key: "textToSpeech", isNew: true },
  { href: "/qr-code-generator", key: "qrGenerator", isNew: false },
] as const;

// Desktop-only dropdown: six flat links no longer fit the bar, so the tool pages live here.
export function ToolsMenu({
  label,
  newLabel,
  items,
  light = false,
}: {
  label: string;
  newLabel: string;
  items: { href: string; label: string; isNew: boolean }[];
  light?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          light
            ? "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-[#5b6660] hover:text-[#15201b] hover:bg-[#e6efe6] transition-colors"
            : "inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium text-ink/65 hover:text-ink hover:bg-white/80 transition-colors"
        }
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        <NewBadge label={newLabel} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute left-0 top-full mt-2 min-w-[230px] rounded-2xl border p-1.5 shadow-xl ${light ? "border-[#e6efe6]" : "border-ink/10"}`}
          style={{
            background: light ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {items.map((i) => (
            <LocaleLink
              key={i.href}
              href={i.href}
              role="menuitem"
              className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${light ? "text-[#5b6660] hover:text-[#15201b] hover:bg-[#e6efe6]" : "text-ink/75 hover:text-ink hover:bg-white/80"}`}
            >
              {i.label}
              {i.isNew && <NewBadge label={newLabel} />}
            </LocaleLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const dict = useDictionary();
  const locale = useLocale();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  useEffect(() => {
    const supabase = getSupabase();

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data: { credits: number } = await res.json();
          setCredits(data.credits);
        }
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setCredits(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push(localePath("/", locale));
    router.refresh();
  };

  // Hide navbar on the dashboard and the full-screen subtitle editor
  const { rest } = parsePathname(pathname);
  if (rest === "/dashboard" || rest.startsWith("/dashboard/subtitles/")) {
    return null;
  }

  const d = dict.navbar;
  const tools = TOOL_LINKS.map((t) => ({ href: t.href, label: d[t.key], isNew: t.isNew }));

  return (
    <div className="sticky top-0 z-50 w-screen max-w-[100vw] overflow-x-clip">
      <header
        className="w-full border-b border-ink/10"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Top accent line matching hero */}
        <div className="absolute left-0 right-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(143,208,176,.45)_30%,rgba(244,176,143,.3)_70%,transparent)]" />

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <LocaleLink href="/" className="flex shrink-0 items-center gap-2.5">
            <Image
              src="/logo.jpeg"
              alt="HelaVoice.lk"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-cover"
            />
            <span className="font-display text-lg font-bold text-ink">
              HelaVoice.lk
            </span>
          </LocaleLink>

          {/* ── Desktop nav ───────────────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-2 whitespace-nowrap">
            <LanguageSwitcher />

            {user ? (
              <>
                <LocaleLink
                  href="/dashboard"
                  className="px-4 py-2 rounded-full text-sm font-medium text-ink/65 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.dashboard}
                </LocaleLink>

                <LocaleLink
                  href="/dashboard/subtitles"
                  className="px-4 py-2 rounded-full text-sm font-medium text-ink/65 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.subtitles}
                </LocaleLink>

                <ToolsMenu label={d.tools} newLabel={d.new} items={tools} />

                <LocaleLink href="/pricing">
                  <button className="hero-primary-button inline-flex items-center gap-1.5 rounded-2xl px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                    {d.buyCredits}
                  </button>
                </LocaleLink>

                {credits !== null && <CreditBalance credits={credits} />}

                <div className="hidden xl:flex flex-col items-end">
                  <span className="text-[11px] font-medium text-ink/55 leading-none mb-0.5">
                    Logged in as
                  </span>
                  <span className="text-xs font-semibold text-ink/75 max-w-[140px] truncate">
                    {user.email}
                  </span>
                </div>

                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-full text-sm font-medium text-ink/55 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.signOut}
                </button>
              </>
            ) : (
              <>
                <nav className="flex items-center gap-1">
                  <LocaleLink
                    href="/subtitles"
                    className="px-4 py-2 rounded-full text-sm font-medium text-ink/65 hover:text-ink hover:bg-white/80 transition-colors"
                  >
                    {d.subtitles}
                  </LocaleLink>
                  <ToolsMenu label={d.tools} newLabel={d.new} items={tools} />
                  <LocaleLink
                    href="/pricing"
                    className="px-4 py-2 rounded-full text-sm font-medium text-ink/65 hover:text-ink hover:bg-white/80 transition-colors"
                  >
                    {d.pricing}
                  </LocaleLink>
                  <LocaleLink
                    href="/blog"
                    className="px-4 py-2 rounded-full text-sm font-medium text-ink/65 hover:text-ink hover:bg-white/80 transition-colors"
                  >
                    {d.blog}
                  </LocaleLink>
                </nav>

                <LocaleLink
                  href="/login"
                  className="px-4 py-2 rounded-full text-sm font-medium text-ink/65 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.logIn}
                </LocaleLink>

                <LocaleLink href="/signup">
                  <button className="hero-primary-button inline-flex items-center gap-1.5 rounded-2xl px-5 py-2 text-sm font-semibold text-white">
                    {d.getStarted}
                  </button>
                </LocaleLink>
              </>
            )}
          </div>

          {/* ── Mobile right side ─────────────────────────────────────── */}
          <div className="flex lg:hidden items-center gap-2">
            {user && (
              <>
                {/* Buy Credits — primary CTA always visible on mobile */}
                <LocaleLink href="/pricing">
                  <button className="hero-primary-button inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                    {d.buyCredits}
                  </button>
                </LocaleLink>
                {credits !== null && <CreditBalance credits={credits} />}
              </>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="p-2 rounded-full text-ink/65 hover:text-ink hover:bg-white/80 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile dropdown ───────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-b border-ink/10 px-5 pb-5 pt-3"
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="mb-2">
            <LanguageSwitcher />
          </div>

          {user ? (
            <>
              <div className="mb-3 px-1 border-b border-ink/10 pb-3">
                <p className="text-[11px] text-ink/55 mb-0.5">Signed in as</p>
                <p className="text-sm font-semibold text-ink/85 truncate">{user.email}</p>
              </div>
              <nav className="flex flex-col gap-1">
                <LocaleLink
                  href="/dashboard"
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.dashboard}
                </LocaleLink>
                <LocaleLink
                  href="/dashboard/subtitles"
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.subtitles}
                </LocaleLink>
                <LocaleLink
                  href="/singlish-to-sinhala"
                  className="inline-flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.singlishTool}
                  <NewBadge label={d.new} />
                </LocaleLink>
                <LocaleLink
                  href="/english-to-sinhala"
                  className="inline-flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.translate}
                  <NewBadge label={d.new} />
                </LocaleLink>
                <LocaleLink
                  href="/sinhala-text-to-speech"
                  className="inline-flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.textToSpeech}
                  <NewBadge label={d.new} />
                </LocaleLink>
                <LocaleLink
                  href="/qr-code-generator"
                  className="inline-flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.qrGenerator}
                </LocaleLink>
                <button
                  onClick={handleSignOut}
                  className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink/55 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.signOut}
                </button>
              </nav>
            </>
          ) : (
            <>
              <nav className="flex flex-col gap-1 mb-4">
                <LocaleLink
                  href="/"
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  Home
                </LocaleLink>
                <LocaleLink
                  href="/subtitles"
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.subtitles}
                </LocaleLink>
                <LocaleLink
                  href="/singlish-to-sinhala"
                  className="inline-flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.singlishTool}
                  <NewBadge label={d.new} />
                </LocaleLink>
                <LocaleLink
                  href="/english-to-sinhala"
                  className="inline-flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.translate}
                  <NewBadge label={d.new} />
                </LocaleLink>
                <LocaleLink
                  href="/sinhala-text-to-speech"
                  className="inline-flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.textToSpeech}
                  <NewBadge label={d.new} />
                </LocaleLink>
                <LocaleLink
                  href="/qr-code-generator"
                  className="inline-flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.qrGenerator}
                </LocaleLink>
                <LocaleLink
                  href="/pricing"
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.pricing}
                </LocaleLink>
                <LocaleLink
                  href="/blog"
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-ink/75 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.blog}
                </LocaleLink>
              </nav>
              <div className="flex flex-col gap-2">
                <LocaleLink
                  href="/login"
                  className="block px-4 py-2.5 rounded-xl text-center text-sm font-medium text-ink/65 border border-ink/10 hover:text-ink hover:bg-white/80 transition-colors"
                >
                  {d.logIn}
                </LocaleLink>
                <LocaleLink href="/signup">
                  <button className="hero-primary-button w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
                    {d.getStarted}
                  </button>
                </LocaleLink>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
