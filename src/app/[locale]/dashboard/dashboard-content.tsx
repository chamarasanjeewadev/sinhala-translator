"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Mic,
  Search,
  FileText,
  Trash2,
  Copy,
  Check,
  X,
  AudioWaveform,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { LocaleLink } from "@/components/locale-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath } from "@/lib/i18n/utils";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transcription } from "@/lib/types";
import { RecordingModal } from "@/components/recording-modal";

interface DashboardContentProps {
  initialCredits: number;
  initialTranscriptions: Transcription[];
}

export function DashboardContent({
  initialCredits,
  initialTranscriptions,
}: DashboardContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dict = useDictionary();
  const locale = useLocale();
  const d = dict.dashboard;
  const nav = dict.navbar;
  const supabaseRef = useRef<SupabaseClient | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  const handleSignOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push(localePath("/", locale));
    router.refresh();
  };

  const [credits, setCredits] = useState(initialCredits);
  const [transcriptions, setTranscriptions] = useState(initialTranscriptions);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "week">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      toast.success(d.paymentSuccess);
      fetchCredits();
    }
  }, [searchParams, d.paymentSuccess]);

  const fetchCredits = useCallback(async () => {
    const res = await fetch("/api/credits");
    if (res.ok) {
      const data: { credits: number } = await res.json();
      setCredits(data.credits);
    }
  }, []);

  const fetchTranscriptions = useCallback(async () => {
    const res = await fetch("/api/transcriptions");
    if (res.ok) {
      const data: { transcriptions: Transcription[] } = await res.json();
      setTranscriptions(data.transcriptions);
    }
  }, []);

  const handleTranscriptionComplete = useCallback(
    (_text: string, creditsRemaining: number) => {
      setCredits(creditsRemaining);
      fetchTranscriptions();
      setIsRecordingModalOpen(false);
      toast.success(d.transcriptionComplete);
    },
    [fetchTranscriptions, d.transcriptionComplete]
  );

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transcription?")) return;

    const res = await fetch(`/api/transcriptions?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setTranscriptions((prev) => prev.filter((t) => t.id !== id));
      toast.success("Transcription deleted");
    } else {
      toast.error("Failed to delete transcription");
    }
  };

  const filteredTranscriptions = transcriptions.filter((t) => {
    if (
      searchQuery &&
      !t.transcription_text.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(t.created_at) >= today;
    } else if (filter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(t.created_at) >= weekAgo;
    }

    return true;
  });

  // Group by date
  const groupedTranscriptions = filteredTranscriptions.reduce(
    (acc, t) => {
      const date = new Date(t.created_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;
      if (date >= today) {
        dateKey = "Today";
      } else if (date >= yesterday) {
        dateKey = "Yesterday";
      } else {
        dateKey = date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year:
            date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
        });
      }

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(t);
      return acc;
    },
    {} as Record<string, Transcription[]>
  );

  const noCredits = credits <= 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-40">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50/90 to-yellow-50/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Left: Brand + Nav */}
          <div className="flex items-center gap-6">
            <LocaleLink href="/" className="flex items-center gap-2">
              <Image
                src="/logo.jpeg"
                alt="HelaVoice.lk"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg object-cover shadow-md"
              />
              <span className="text-lg font-bold hidden sm:block text-slate-900">
                HelaVoice.lk
              </span>
            </LocaleLink>

            <nav className="hidden sm:flex items-center gap-1">
              <LocaleLink
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-900 shadow-sm"
              >
                {d.title}
              </LocaleLink>
            </nav>
          </div>

          {/* Right: Credits + Language + Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Credits pill */}
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] text-slate-500">Credits</div>
                <div className="text-sm font-bold text-slate-900">{credits}</div>
              </div>
            </div>

            <LocaleLink
              href="/pricing"
              className="hidden sm:inline-flex bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/20"
            >
              {d.buyCredits}
            </LocaleLink>

            <div className="[&_button]:text-slate-500 [&_button]:hover:text-slate-900">
              <LanguageSwitcher />
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{nav.signOut}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters + Search */}
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex gap-2">
            {(["all", "today", "week"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {f === "all" ? "All" : f === "today" ? "Today" : "This Week"}
              </button>
            ))}
          </div>

          {showSearch ? (
            <div className="relative flex items-center gap-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search transcriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent w-56 shadow-sm"
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center justify-center transition-all shadow-sm"
            >
              <Search className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Transcription Grid */}
        {filteredTranscriptions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Mic className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900">
              No transcriptions yet
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Tap the microphone button below to record or upload Sinhala audio
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTranscriptions).map(([date, items]) => (
              <div key={date}>
                <h2 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">
                  {date}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-slate-300 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs text-slate-400 font-medium">
                          {new Date(t.created_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              handleCopy(t.transcription_text, t.id)
                            }
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors"
                          >
                            {copiedId === t.id ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="w-7 h-7 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-red-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-4 leading-relaxed">
                        {t.transcription_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Mic Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-5xl mx-auto px-4 pb-8 flex justify-center">
          <button
            onClick={() => setIsRecordingModalOpen(true)}
            disabled={noCredits}
            className="pointer-events-auto relative group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition-opacity animate-pulse" />
            {/* Button */}
            <div className="relative w-[72px] h-[72px] bg-gradient-to-br from-violet-500 to-blue-600 hover:from-violet-400 hover:to-blue-500 rounded-full flex items-center justify-center shadow-2xl shadow-violet-600/40 transition-all group-hover:scale-110">
              <Mic className="w-9 h-9 text-white" />
            </div>
          </button>
        </div>
        {noCredits && (
          <div className="pointer-events-auto text-center pb-4">
            <p className="text-xs text-red-600 font-medium">
              {d.outOfCredits}{" "}
              <LocaleLink
                href="/pricing"
                className="underline hover:text-red-800"
              >
                {d.buyCredits}
              </LocaleLink>
            </p>
          </div>
        )}
      </div>

      {/* Recording Modal */}
      <RecordingModal
        isOpen={isRecordingModalOpen}
        onClose={() => setIsRecordingModalOpen(false)}
        onTranscriptionComplete={handleTranscriptionComplete}
        credits={credits}
      />
    </div>
  );
}
