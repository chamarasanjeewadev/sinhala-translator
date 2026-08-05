import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubtitlesContent } from "./subtitles-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function SubtitlesLoading() {
  return (
    <div className="min-h-screen bg-[#0f0f1e] flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
    </div>
  );
}

async function SubtitlesServer() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  const { data: projects } = await supabase
    .from("subtitle_projects")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <SubtitlesContent
      initialCredits={profile?.credits ?? 0}
      initialProjects={projects ?? []}
    />
  );
}

export default function SubtitlesPage() {
  return (
    <Suspense fallback={<SubtitlesLoading />}>
      <SubtitlesServer />
    </Suspense>
  );
}
