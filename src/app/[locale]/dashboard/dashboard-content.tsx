"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
    <div className="min-h-screen bg-[#0f0f1e] text-white pb-40">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0f0f1e]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Left: Brand + Nav */}
          <div className="flex items-center gap-6">
            <LocaleLink href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-blue-600 rounded-lg flex items-center justify-center">
                <AudioWaveform className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold hidden sm:block">
                HelaVoice
              </span>
            </LocaleLink>

            <nav className="hidden sm:flex items-center gap-1">
              <LocaleLink
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 text-white"
              >
                {d.title}
              </LocaleLink>
              <LocaleLink
                href="/pricing"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                {nav.buyCredits}
              </LocaleLink>
            </nav>
          </div>

          {/* Right: Credits + Language + Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Credits pill */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] text-gray-500">Credits</div>
                <div className="text-sm font-bold">{credits}</div>
              </div>
            </div>

            <LocaleLink
              href="/pricing"
              className="hidden sm:inline-flex bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/20"
            >
              {d.buyCredits}
            </LocaleLink>

            <div className="[&_button]:text-gray-400 [&_button]:hover:text-white">
              <LanguageSwitcher />
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
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
                    ? "bg-white text-black"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {f === "all" ? "All" : f === "today" ? "Today" : "This Week"}
              </button>
            ))}
          </div>

          {showSearch ? (
            <div className="relative flex items-center gap-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search transcriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent w-56"
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all"
            >
              <Search className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Transcription Grid */}
        {filteredTranscriptions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-5">
              <Mic className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              No transcriptions yet
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Tap the microphone button below to record or upload Sinhala audio
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTranscriptions).map(([date, items]) => (
              <div key={date}>
                <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">
                  {date}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.06] transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs text-gray-500">
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
                            className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center"
                          >
                            {copiedId === t.id ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="w-7 h-7 bg-white/10 hover:bg-red-500/20 rounded-lg flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-4 leading-relaxed">
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
            <p className="text-xs text-red-400">
              {d.outOfCredits}{" "}
              <LocaleLink
                href="/pricing"
                className="underline hover:text-red-300"
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
