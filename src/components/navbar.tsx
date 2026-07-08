"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { Menu, X } from "lucide-react";
import { CreditBalance } from "@/components/credit-balance";
import { LocaleLink } from "@/components/locale-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath, parsePathname } from "@/lib/i18n/utils";
import { createClient } from "@/lib/supabase/client";
import type { User, SupabaseClient } from "@supabase/supabase-js";

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

  // Hide navbar on dashboard
  const { rest } = parsePathname(pathname);
  if (rest === "/dashboard") {
    return null;
  }

  const d = dict.navbar;

  return (
    <div className="sticky top-0 z-50 w-screen max-w-[100vw] overflow-x-clip">
      <header
        className="w-full border-b border-white/8"
        style={{
          background: "rgba(7,0,15,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Top accent line matching hero */}
        <div className="absolute left-0 right-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(124,58,237,.45)_30%,rgba(232,121,249,.3)_70%,transparent)]" />

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
            <span className="font-display text-lg font-bold text-white">
              HelaVoice.lk
            </span>
          </LocaleLink>

          {/* ── Desktop nav ───────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />

            {user ? (
              <>
                <LocaleLink
                  href="/dashboard"
                  className="px-4 py-2 rounded-full text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors"
                >
                  {d.dashboard}
                </LocaleLink>

                <LocaleLink href="/pricing">
                  <button className="hero-primary-button inline-flex items-center gap-1.5 rounded-2xl px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                    {d.buyCredits}
                  </button>
                </LocaleLink>

                {credits !== null && <CreditBalance credits={credits} />}

                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-medium text-white/35 leading-none mb-0.5">
                    Logged in as
                  </span>
                  <span className="text-xs font-semibold text-white/70 max-w-[140px] truncate">
                    {user.email}
                  </span>
                </div>

                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-full text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-colors"
                >
                  {d.signOut}
                </button>
              </>
            ) : (
              <>
                <nav className="flex items-center gap-1">
                  <LocaleLink
                    href="/pricing"
                    className="px-4 py-2 rounded-full text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    {d.pricing}
                  </LocaleLink>
                  <LocaleLink
                    href="/blog"
                    className="px-4 py-2 rounded-full text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    {d.blog}
                  </LocaleLink>
                </nav>

                <LocaleLink
                  href="/login"
                  className="px-4 py-2 rounded-full text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors"
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
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <>
                {/* Buy Minutes — primary CTA always visible on mobile */}
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
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/8 transition-colors"
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
          className="md:hidden border-b border-white/8 px-5 pb-5 pt-3"
          style={{
            background: "rgba(7,0,15,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="mb-2">
            <LanguageSwitcher />
          </div>

          {user ? (
            <>
              <div className="mb-3 px-1 border-b border-white/8 pb-3">
                <p className="text-[11px] text-white/35 mb-0.5">Signed in as</p>
                <p className="text-sm font-semibold text-white/80 truncate">{user.email}</p>
              </div>
              <nav className="flex flex-col gap-1">
                <LocaleLink
                  href="/dashboard"
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                >
                  {d.dashboard}
                </LocaleLink>
                <button
                  onClick={handleSignOut}
                  className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-colors"
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
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                >
                  Home
                </LocaleLink>
                <LocaleLink
                  href="/pricing"
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                >
                  {d.pricing}
                </LocaleLink>
                <LocaleLink
                  href="/blog"
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                >
                  {d.blog}
                </LocaleLink>
              </nav>
              <div className="flex flex-col gap-2">
                <LocaleLink
                  href="/login"
                  className="block px-4 py-2.5 rounded-xl text-center text-sm font-medium text-white/60 border border-white/12 hover:text-white hover:bg-white/8 transition-colors"
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
