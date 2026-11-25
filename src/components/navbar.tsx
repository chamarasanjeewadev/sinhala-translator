"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { ChevronDown, Menu, X, LogOut } from "lucide-react";
import { FREE_TOOLS, PAID_TOOLS, TOOLS, IconTile, CostBadge, costNote, type ToolKey } from "@/components/tool-catalog";
import { LocaleLink } from "@/components/locale-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath, parsePathname, t } from "@/lib/i18n/utils";
import { createClient } from "@/lib/supabase/client";
import type { User, SupabaseClient } from "@supabase/supabase-js";

/** dict.navbar; dictionaries are untyped JSON. */
type NavDict = ReturnType<typeof useDictionary>["navbar"];

const LINK =
  "inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/[0.05] hover:text-ink";
const PRIMARY =
  "inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-[#2c3a33] active:translate-y-px";

/** Open state that closes on outside click, Escape and route change. */
function useDisclosure() {
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

  return { open, setOpen, ref };
}

/** One tool row: icon, name, its cost badge, and what it costs or does. */
function ToolRow({ k, signedIn, d }: { k: ToolKey; signedIn: boolean; d: NavDict }) {
  const tool = TOOLS.find((x) => x.key === k)!;
  return (
    <LocaleLink
      href={signedIn ? (tool.appHref ?? tool.href) : tool.href}
      className="flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-ink/[0.04]"
    >
      <IconTile icon={tool.icon} tone={tool.tone} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink">
          {d[k]}
          <CostBadge cost={tool.cost} labels={d} />
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink/60">{costNote(d, k)}</span>
      </span>
    </LocaleLink>
  );
}

/** The two tool groups, free first. Used by the desktop panel and the mobile menu. */
export function ToolGroups({ signedIn, d, stacked = false }: { signedIn: boolean; d: NavDict; stacked?: boolean }) {
  return (
    <div className={stacked ? "grid gap-5" : "grid grid-cols-2 gap-4"}>
      {[
        { title: d.freeGroup, tools: FREE_TOOLS },
        { title: d.paidGroup, tools: PAID_TOOLS },
      ].map((g) => (
        <div key={g.title}>
          <p className="px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-ink/50">{g.title}</p>
          <div className="grid gap-0.5">
            {g.tools.map((tool) => (
              <ToolRow key={tool.key} k={tool.key} signedIn={signedIn} d={d} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Desktop Tools button with the free / paid panel. Also used in the dashboard header. */
export function ToolsMenu({ signedIn, align = "left" }: { signedIn: boolean; align?: "left" | "right" }) {
  const d = useDictionary().navbar;
  const { open, setOpen, ref } = useDisclosure();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="tools-panel"
        className={`${LINK} gap-1 ${open ? "bg-ink/[0.05] text-ink" : ""}`}
      >
        {d.tools}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id="tools-panel"
          className={`absolute top-full z-50 mt-2 w-[620px] rounded-xl border border-ink/10 bg-white p-3 text-left shadow-[0_18px_50px_rgba(21,32,27,0.12)] ${align === "right" ? "right-0" : "left-0"}`}
        >
          <ToolGroups signedIn={signedIn} d={d} />
          <div className="mt-3 flex justify-end rounded-lg bg-[#f3f7f2] px-3 py-2.5 text-[13px]">
            <LocaleLink href="/pricing" className="font-semibold text-ink underline-offset-4 hover:underline">
              {d.seePrices} →
            </LocaleLink>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountMenu({ email, onSignOut, d }: { email: string; onSignOut: () => void; d: NavDict }) {
  const { open, setOpen, ref } = useDisclosure();
  const item = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink/80 hover:bg-ink/[0.04]";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={d.account}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e3f3e8] text-sm font-bold uppercase text-[#1d6b47] transition-colors hover:bg-[#d3ecdb]"
      >
        {email.charAt(0)}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-ink/10 bg-white p-1.5 shadow-[0_18px_50px_rgba(21,32,27,0.12)]">
          <div className="px-3 py-2">
            <p className="text-xs text-ink/55">{d.signedInAs}</p>
            <p className="truncate text-sm font-semibold text-ink">{email}</p>
          </div>
          <LocaleLink href="/dashboard" className={item}>
            {d.dashboard}
          </LocaleLink>
          <LocaleLink href="/dashboard/subtitles" className={item}>
            {d.mySubtitles}
          </LocaleLink>
          <button type="button" onClick={onSignOut} className={item}>
            <LogOut className="h-4 w-4" />
            {d.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

/** Balance and the way to top it up, as one control. */
export function CreditsChip({ credits, d }: { credits: number; d: NavDict }) {
  return (
    <LocaleLink
      href="/pricing"
      className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-ink/10 bg-white pl-3 pr-1 text-sm transition-colors hover:border-ink/25"
    >
      <span className={`font-semibold ${credits > 0 ? "text-ink" : "text-[#ba1a1a]"}`}>
        {t(d.creditsShort, { count: credits })}
      </span>
      <span className="rounded-md bg-ink px-2 py-1.5 text-xs font-semibold leading-none text-white">{d.buyCredits}</span>
    </LocaleLink>
  );
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const d = useDictionary().navbar;
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

  const signedIn = Boolean(user);

  return (
    <div className="sticky top-0 z-50 w-full">
      <header className="border-b border-ink/10 bg-[#f3f7f2]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <LocaleLink href="/" aria-label="HelaVoice.lk" className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
            {/* Signed in, the credits chip needs the room on small phones; the logo stays. */}
            <span className={`font-display text-[17px] font-bold tracking-tight text-ink ${user ? "hidden min-[420px]:inline" : ""}`}>HelaVoice.lk</span>
          </LocaleLink>

          {/* Desktop: what you can use on the left, your account on the right */}
          <nav className="hidden flex-1 items-center gap-0.5 lg:flex" aria-label="Main">
            {signedIn && (
              <LocaleLink href="/dashboard" className={LINK}>
                {d.dashboard}
              </LocaleLink>
            )}
            <ToolsMenu signedIn={signedIn} />
            <LocaleLink href="/pricing" className={LINK}>
              {d.pricing}
            </LocaleLink>
            <LocaleLink href="/blog" className={LINK}>
              {d.blog}
            </LocaleLink>
          </nav>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <LanguageSwitcher />
            {user ? (
              <>
                {credits !== null && <CreditsChip credits={credits} d={d} />}
                <AccountMenu email={user.email ?? "?"} onSignOut={handleSignOut} d={d} />
              </>
            ) : (
              <>
                <LocaleLink href="/login" className={LINK}>
                  {d.logIn}
                </LocaleLink>
                <LocaleLink href="/signup" className={PRIMARY}>
                  {d.startFree}
                </LocaleLink>
              </>
            )}
          </div>

          {/* Mobile */}
          <div className="ml-auto flex items-center gap-2 lg:hidden">
            {user && credits !== null && <CreditsChip credits={credits} d={d} />}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={d.menu}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-ink/70 transition-colors hover:bg-ink/[0.05] hover:text-ink"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-ink/10 bg-[#f3f7f2] px-4 pb-6 pt-4 lg:hidden"
        >
          {user && (
            <div className="mb-4 rounded-lg bg-white px-3 py-2.5">
              <p className="text-xs text-ink/55">{d.signedInAs}</p>
              <p className="truncate text-sm font-semibold text-ink">{user.email}</p>
            </div>
          )}

          <ToolGroups signedIn={signedIn} d={d} stacked />

          <nav className="mt-5 grid gap-0.5 border-t border-ink/10 pt-4" aria-label="Mobile">
            {user && (
              <>
                <LocaleLink href="/dashboard" className={LINK}>
                  {d.dashboard}
                </LocaleLink>
                <LocaleLink href="/dashboard/subtitles" className={LINK}>
                  {d.mySubtitles}
                </LocaleLink>
              </>
            )}
            <LocaleLink href="/pricing" className={LINK}>
              {d.pricing}
            </LocaleLink>
            <LocaleLink href="/blog" className={LINK}>
              {d.blog}
            </LocaleLink>
            <div className="px-1 pt-1">
              <LanguageSwitcher />
            </div>
          </nav>

          <div className="mt-4 grid gap-2">
            {user ? (
              <button type="button" onClick={handleSignOut} className={`${LINK} justify-center border border-ink/15`}>
                {d.signOut}
              </button>
            ) : (
              <>
                <LocaleLink href="/signup" className={`${PRIMARY} justify-center`}>
                  {d.startFree}
                </LocaleLink>
                <LocaleLink href="/login" className={`${LINK} justify-center border border-ink/15`}>
                  {d.logIn}
                </LocaleLink>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
