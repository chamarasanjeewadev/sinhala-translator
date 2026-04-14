"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
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
    <header className="glass-panel shadow-ambient sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6 lg:px-8">

        {/* Logo */}
        <LocaleLink href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/logo.jpeg"
            alt="HelaVoice.lk"
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl object-cover"
          />
          <span className="font-display text-lg font-bold text-[#340075]">
            HelaVoice.lk
          </span>
        </LocaleLink>

        {/* Center nav links — unauthenticated only, hidden on mobile */}
        {!user && (
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <LocaleLink
              href="/pricing"
              className="px-4 py-2 rounded-full text-sm font-medium text-[#111c2d] hover:bg-[#f0f3ff] transition-colors"
            >
              {d.pricing}
            </LocaleLink>
            <LocaleLink
              href="/blog"
              className="px-4 py-2 rounded-full text-sm font-medium text-[#111c2d] hover:bg-[#f0f3ff] transition-colors"
            >
              {d.blog}
            </LocaleLink>
          </nav>
        )}

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {user ? (
            <>
              {/* Dashboard link */}
              <LocaleLink
                href="/dashboard"
                className="hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-medium text-[#111c2d] hover:bg-[#f0f3ff] transition-colors"
              >
                {d.dashboard}
              </LocaleLink>

              {/* Buy Credits CTA */}
              <LocaleLink href="/pricing">
                <button
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-primary shadow-none ring-2 ring-[#4c1d95]/20 ring-offset-0 hover:opacity-90 transition-opacity"
                >
                  {d.buyCredits}
                </button>
              </LocaleLink>

              {/* Credit balance */}
              {credits !== null && <CreditBalance credits={credits} />}

              {/* User email */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[11px] font-medium text-[#4a4452] leading-none mb-0.5">
                  Logged in as
                </span>
                <span className="text-xs font-semibold text-[#111c2d] max-w-[140px] truncate">
                  {user.email}
                </span>
              </div>

              {/* Sign out ghost button */}
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-full text-sm font-medium text-[#111c2d] hover:bg-[#e7eeff] transition-colors"
              >
                {d.signOut}
              </button>
            </>
          ) : (
            <>
              {/* Log In ghost button */}
              <LocaleLink
                href="/login"
                className="px-4 py-2 rounded-full text-sm font-medium text-[#111c2d] hover:bg-[#f0f3ff] transition-colors"
              >
                {d.logIn}
              </LocaleLink>

              {/* Get Started primary CTA */}
              <LocaleLink href="/signup">
                <button
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-primary shadow-none ring-2 ring-[#4c1d95]/20 ring-offset-0 hover:opacity-90 transition-opacity"
                >
                  {d.getStarted}
                </button>
              </LocaleLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
