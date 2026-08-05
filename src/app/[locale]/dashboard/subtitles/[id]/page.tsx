import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { SubtitleEditor } from "@/components/subtitles/subtitle-editor";
import { SUBTITLE_FONTS_HREF } from "@/lib/subtitle-style";
import type { SubtitleProject } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function EditorLoading() {
  return (
    <div className="min-h-screen bg-[#0f0f1e] flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
    </div>
  );
}

async function EditorServer({ id }: { id: string }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: project } = await supabase
    .from("subtitle_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .single();

  if (!project) {
    return notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  return (
    <>
      {/* Subtitle fonts (free/OFL) for the styled overlay and burned-in export */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={SUBTITLE_FONTS_HREF} />
      <SubtitleEditor
        project={project as SubtitleProject}
        initialCredits={profile?.credits ?? 0}
      />
    </>
  );
}

export default async function SubtitleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorServer id={id} />
    </Suspense>
  );
}
