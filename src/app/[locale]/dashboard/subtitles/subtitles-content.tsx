"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { VideoUploader } from "@/components/subtitles/video-uploader";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath, t } from "@/lib/i18n/utils";
import { setPendingVideo } from "@/lib/pending-video";
import { SUBTITLE_CREDITS_PER_MINUTE } from "@/lib/constants";
import type { SubtitleLanguage, SubtitleProject } from "@/lib/types";

interface SubtitlesContentProps {
  initialCredits: number;
  initialProjects: SubtitleProject[];
}

export function SubtitlesContent({
  initialCredits,
  initialProjects,
}: SubtitlesContentProps) {
  const dict = useDictionary();
  const d = dict.subtitles;
  const router = useRouter();
  const locale = useLocale();

  const [projects, setProjects] = useState(initialProjects);
  const [language, setLanguage] = useState<SubtitleLanguage>("si");
  const [creating, setCreating] = useState(false);

  const handleFileSelected = useCallback(
    async (file: File, durationSeconds: number) => {
      setCreating(true);
      try {
        const res = await fetch("/api/subtitle-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: file.name.replace(/\.[^.]+$/, ""),
            videoFilename: file.name,
            videoSizeBytes: file.size,
            videoDurationSeconds: durationSeconds,
            language,
          }),
        });
        if (!res.ok) {
          const data: { error?: string } = await res.json();
          toast.error(data.error || d.createFailed);
          return;
        }
        const data: { project: SubtitleProject } = await res.json();
        setPendingVideo(file);
        router.push(localePath(`/dashboard/subtitles/${data.project.id}`, locale));
      } catch {
        toast.error(d.createFailed);
      } finally {
        setCreating(false);
      }
    },
    [language, router, locale, d.createFailed]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm(d.deleteConfirm)) return;
      const res = await fetch(`/api/subtitle-projects?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        toast.success(d.deleted);
      } else {
        toast.error(d.deleteFailed);
      }
    },
    [d.deleteConfirm, d.deleted, d.deleteFailed]
  );

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">{d.title}</h1>
          <p className="text-sm text-white/60">{d.subtitle}</p>
          <p className="text-xs text-white/40 mt-1">
            {t(d.creditsLeft, { credits: initialCredits })} ·{" "}
            {t(d.rateNote, { rate: SUBTITLE_CREDITS_PER_MINUTE })}
          </p>
        </div>

        {/* New project */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-10">
          <h2 className="text-base font-semibold mb-1">{d.newProject}</h2>
          <p className="text-xs text-white/50 mb-4">{d.privacyNote}</p>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-white/50">{d.audioLanguage}</span>
            {(["si", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  language === lang
                    ? "bg-violet-600 border-violet-500 text-white"
                    : "bg-white/5 border-white/15 text-white/60 hover:text-white"
                }`}
              >
                {lang === "si" ? d.sinhala : d.english}
              </button>
            ))}
          </div>

          {creating ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              <span className="text-sm text-white/70">{d.creatingProject}</span>
            </div>
          ) : (
            <VideoUploader onFileSelected={handleFileSelected} />
          )}
        </div>

        {/* Project list */}
        <h2 className="text-base font-semibold mb-3">{d.yourProjects}</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-white/40">{d.noProjects}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() =>
                  router.push(
                    localePath(`/dashboard/subtitles/${project.id}`, locale)
                  )
                }
                className="group flex items-center gap-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 p-4 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#340075] to-[#4c1d95] flex items-center justify-center shrink-0">
                  <Clapperboard className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {project.title || project.video_filename}
                  </p>
                  <p className="text-xs text-white/40">
                    {formatDuration(project.video_duration_seconds)} ·{" "}
                    {t(d.segmentCount, { count: project.segments.length })}
                    {project.is_partial ? ` · ${d.partial}` : ""}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                  className="p-2 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  aria-label={d.deleteProject}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
