import { createClientFromRequest } from "@/lib/supabase/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { privateJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportError, toClientError } from "@/lib/report-error";
import { extractSinhalaText } from "@/lib/gemini-scan";
import { freePagesUsed } from "@/lib/scan-usage";
import {
  SCAN_FREE_PAGES,
  SCAN_MAX_IMAGE_BYTES,
  isScanMime,
  scanCharge,
} from "@/lib/scan-to-text";

// Sinhala page image → text. Signed-in only: each account gets SCAN_FREE_PAGES free
// pages (lifetime), then SCAN_CREDITS_PER_PAGE credit per page. Credits are
// deducted AFTER a successful read, like the other pipelines.

/** Allowance + balance for the page header. Anonymous callers just see the free offer. */
export async function GET(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);
  if (!user) return privateJson({ signedIn: false, freePagesLeft: SCAN_FREE_PAGES, credits: 0 });

  try {
    const [used, { data: profile }] = await Promise.all([
      freePagesUsed(user.id),
      supabase.from("profiles").select("credits").eq("id", user.id).single(),
    ]);
    return privateJson({
      signedIn: true,
      freePagesLeft: Math.max(0, SCAN_FREE_PAGES - used),
      credits: profile?.credits ?? 0,
    });
  } catch (err) {
    reportError(err, { route: "scan-to-text:status", userId: user.id });
    return privateJson({ error: "Could not load usage" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { supabase, bearerToken } = await createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);
  if (!user) return privateJson({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });

  if (!(await checkRateLimit(`scan:${user.id}`, "TRANSLATE_RATE_LIMITER"))) {
    return privateJson(
      { error: "Too many requests. Please wait a minute and try again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  let body: { image?: unknown; mimeType?: unknown };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body", code: "BAD_REQUEST" }, { status: 400 });
  }

  const { image, mimeType } = body;
  if (typeof image !== "string" || !image || !isScanMime(mimeType)) {
    return privateJson({ error: "Send a JPG, PNG or WebP image.", code: "BAD_REQUEST" }, { status: 400 });
  }
  if ((image.length * 3) / 4 > SCAN_MAX_IMAGE_BYTES) {
    return privateJson(
      { error: "Image is too large. Please use a smaller photo.", code: "TOO_LARGE", limit: SCAN_MAX_IMAGE_BYTES },
      { status: 413 }
    );
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) return privateJson({ error: "Scan service not configured" }, { status: 500 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, is_blocked")
    .eq("id", user.id)
    .single();
  if (profile?.is_blocked) return privateJson({ error: "Account suspended" }, { status: 403 });
  if (!profile) return privateJson({ error: "Profile not found" }, { status: 404 });

  let used: number;
  try {
    used = await freePagesUsed(user.id);
  } catch (err) {
    reportError(err, { route: "scan-to-text", userId: user.id });
    return privateJson({ error: "Could not read the page. Please try again." }, { status: 500 });
  }

  // Check the balance BEFORE paying Gemini to read the page.
  const charge = scanCharge(used);
  if (profile.credits < charge.credits) {
    return privateJson(
      { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS", creditsNeeded: charge.credits },
      { status: 402 }
    );
  }

  let result;
  try {
    result = await extractSinhalaText({ apiKey, image, mimeType });
  } catch (err) {
    reportError(err, { route: "scan-to-text", userId: user.id });
    const { message, code, status } = toClientError(err, "Could not read the page. Please try again.");
    return privateJson({ error: message, code }, { status });
  }

  // Nothing readable: no charge, no ledger row (so the free page is not consumed).
  if (!result.text) {
    return privateJson(
      { error: "No Sinhala text found on this page.", code: "NO_TEXT_FOUND" },
      { status: 422 }
    );
  }

  let creditsRemaining = profile.credits;
  if (charge.credits > 0) {
    const { data: rows, error } = await supabase.rpc("deduct_credits_typed", {
      p_user_id: user.id,
      p_amount: charge.credits,
      p_type: "scan_to_text",
      p_description: "Scan to text (1 page)",
    });
    const deducted = Array.isArray(rows) ? rows[0] : rows;
    if (error || !deducted?.success) {
      // Text already exists — return it rather than lose the user's result.
      reportError(error ?? new Error("scan credit deduction failed"), { route: "scan-to-text:deduct", userId: user.id });
    } else {
      creditsRemaining = deducted.credits_remaining;
    }
  }

  // Usage log doubles as the free-allowance ledger. Must never fail the request.
  // shortcut: read-then-insert, so parallel requests can each get the free allowance;
  // bounded by the per-user rate limit — move into an RPC if abuse shows up.
  try {
    const { error } = await createAdminClient().from("scan_pages").insert({
      user_id: user.id,
      free_pages: charge.free,
      credits: charge.credits,
      chars: result.text.length,
      model: result.model,
    });
    if (error) console.error("scan_pages insert failed:", error);
  } catch (err) {
    console.error("scan_pages insert failed:", err);
  }

  return privateJson({
    text: result.text,
    freePagesLeft: Math.max(0, SCAN_FREE_PAGES - used - charge.free),
    charged: charge.credits,
    creditsRemaining,
  });
}
