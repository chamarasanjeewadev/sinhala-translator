"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { AudioWaveform } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6 lg:px-8">
        <LocaleLink href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <AudioWaveform className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            HelaVoice
          </span>
        </LocaleLink>

        <nav className="flex items-center gap-4">
          <LanguageSwitcher />
          {user ? (
            <>
              <LocaleLink
                href="/dashboard"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium hidden sm:block"
              >
                {d.dashboard}
              </LocaleLink>
              <LocaleLink
                href="/pricing"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium hidden sm:block"
              >
                {d.buyCredits}
              </LocaleLink>
              {credits !== null && <CreditBalance credits={credits} />}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                {d.signOut}
              </Button>
            </>
          ) : (
            <>
              <LocaleLink href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-slate-900"
                >
                  {d.logIn}
                </Button>
              </LocaleLink>
              <LocaleLink href="/signup">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 shadow-lg shadow-slate-900/20 rounded-xl"
                >
                  {d.signUp}
                </Button>
              </LocaleLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
