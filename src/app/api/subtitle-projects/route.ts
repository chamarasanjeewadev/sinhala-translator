import { createClientFromRequest } from "@/lib/supabase/request";
import { privateJson } from "@/lib/api-response";
import { MAX_SUBTITLE_SEGMENTS, MAX_VIDEO_DURATION_SECONDS } from "@/lib/constants";
import type { SubtitleSegment } from "@/lib/types";

// Segments arrive from the client editor; RLS scopes rows to the user, but
// validate shape/size so a buggy client can't store megabytes of junk.
function sanitizeSegments(input: unknown): SubtitleSegment[] | null {
  if (!Array.isArray(input) || input.length > MAX_SUBTITLE_SEGMENTS) return null;
  const result: SubtitleSegment[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const { id, start, end, text } = item as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      typeof text !== "string" ||
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end <= start ||
      text.length > 500
    ) {
      return null;
    }
    result.push({ id, start, end, text });
  }
  return result;
}

function sanitizeStyle(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  if (JSON.stringify(input).length > 2000) return null;
  return input as Record<string, unknown>;
}

export async function GET(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const query = supabase
    .from("subtitle_projects")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  if (id) {
    const { data: project, error } = await query.eq("id", id).single();
    if (error || !project) {
      return privateJson({ error: "Project not found" }, { status: 404 });
    }
    return privateJson({ project });
  }

  const { data: projects, error } = await query
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch subtitle projects:", error);
    return privateJson(
      { error: "Failed to fetch subtitle projects" },
      { status: 500 }
    );
  }

  return privateJson({ projects: projects ?? [] });
}

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    videoFilename?: string;
    videoSizeBytes?: number;
    videoDurationSeconds?: number;
    language?: string;
    segments?: unknown;
    style?: unknown;
    creditsUsed?: number;
    isPartial?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const videoFilename =
    typeof body.videoFilename === "string" ? body.videoFilename.slice(0, 300) : "";
  const videoDurationSeconds = Math.ceil(Number(body.videoDurationSeconds));

  if (
    !videoFilename ||
    !Number.isFinite(videoDurationSeconds) ||
    videoDurationSeconds <= 0 ||
    videoDurationSeconds > MAX_VIDEO_DURATION_SECONDS
  ) {
    return privateJson({ error: "Missing required fields" }, { status: 400 });
  }

  const segments = sanitizeSegments(body.segments ?? []);
  if (!segments) {
    return privateJson({ error: "Invalid segments" }, { status: 400 });
  }

  const { data: project, error } = await supabase
    .from("subtitle_projects")
    .insert({
      user_id: user.id,
      title:
        typeof body.title === "string" ? body.title.slice(0, 200) : null,
      video_filename: videoFilename,
      video_size_bytes:
        Number.isFinite(Number(body.videoSizeBytes)) && Number(body.videoSizeBytes) > 0
          ? Math.round(Number(body.videoSizeBytes))
          : null,
      video_duration_seconds: videoDurationSeconds,
      language: body.language === "en" || body.language === "auto" ? body.language : "si",
      segments,
      style: body.style !== undefined ? sanitizeStyle(body.style) : null,
      credits_used:
        Number.isFinite(Number(body.creditsUsed)) && Number(body.creditsUsed) >= 0
          ? Math.round(Number(body.creditsUsed))
          : 0,
      is_partial: body.isPartial === true,
    })
    .select()
    .single();

  if (error || !project) {
    console.error("Failed to create subtitle project:", error);
    return privateJson(
      { error: "Failed to create subtitle project" },
      { status: 500 }
    );
  }

  return privateJson({ project });
}

export async function PATCH(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return privateJson({ error: "Missing project ID" }, { status: 400 });
  }

  let body: {
    title?: string;
    segments?: unknown;
    style?: unknown;
    creditsUsed?: number;
    isPartial?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.creditsUsed !== undefined) {
    const creditsUsed = Number(body.creditsUsed);
    if (!Number.isFinite(creditsUsed) || creditsUsed < 0) {
      return privateJson({ error: "Invalid creditsUsed" }, { status: 400 });
    }
    updates.credits_used = Math.round(creditsUsed);
  }

  if (body.isPartial !== undefined) {
    if (typeof body.isPartial !== "boolean") {
      return privateJson({ error: "Invalid isPartial" }, { status: 400 });
    }
    updates.is_partial = body.isPartial;
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      return privateJson({ error: "Invalid title" }, { status: 400 });
    }
    updates.title = body.title.slice(0, 200);
  }

  if (body.segments !== undefined) {
    const segments = sanitizeSegments(body.segments);
    if (!segments) {
      return privateJson({ error: "Invalid segments" }, { status: 400 });
    }
    updates.segments = segments;
  }

  if (body.style !== undefined) {
    const style = sanitizeStyle(body.style);
    if (!style) {
      return privateJson({ error: "Invalid style" }, { status: 400 });
    }
    updates.style = style;
  }

  if (Object.keys(updates).length === 0) {
    return privateJson({ error: "No fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("subtitle_projects")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  if (error) {
    console.error("Failed to update subtitle project:", error);
    return privateJson(
      { error: "Failed to update subtitle project" },
      { status: 500 }
    );
  }

  return privateJson({ success: true });
}

export async function DELETE(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);

  if (!user) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return privateJson({ error: "Missing project ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("subtitle_projects")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  if (error) {
    console.error("Failed to delete subtitle project:", error);
    return privateJson(
      { error: "Failed to delete subtitle project" },
      { status: 500 }
    );
  }

  return privateJson({ success: true });
}
