// Throwaway READ-ONLY diagnostic for the cross-account transcription bug.
// Phase A of /Users/chami/.claude/plans/this-is-definetly-not-bright-lagoon.md
// Run: node --env-file=.env scripts/diagnose-transcriptions.mjs
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const line = (s = "") => console.log(s);
const hr = (t) => line(`\n========== ${t} ==========`);

// Pull every transcription (tiny dataset) + owner email.
const { data: rows, error } = await db
  .from("transcriptions")
  .select(
    "id, user_id, title, audio_duration_seconds, credits_used, has_timestamps, is_conversation, is_partial, is_deleted, created_at, transcription_text"
  )
  .order("created_at", { ascending: false });
if (error) {
  console.error("query failed:", error.message);
  process.exit(1);
}

const userIds = [...new Set(rows.map((r) => r.user_id))];
const { data: profs } = await db
  .from("profiles")
  .select("id, email")
  .in("id", userIds);
const emailOf = new Map((profs ?? []).map((p) => [p.id, p.email]));

line(`Total transcriptions: ${rows.length}`);
line(`Distinct users: ${userIds.length}`);

// Parse the largest [mm:ss] / [h:mm:ss] timestamp in a transcript -> seconds.
function maxTimestampSeconds(text) {
  let max = null;
  const re = /\[(?:(\d+):)?(\d{1,2}):(\d{2})\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const h = m[1] ? Number(m[1]) : 0;
    const mm = Number(m[2]);
    const ss = Number(m[3]);
    const total = h * 3600 + mm * 60 + ss;
    if (max === null || total > max) max = total;
  }
  return max;
}

// ---- A.1 suspect rows: very short stored duration ----
hr("A.1  Short-duration rows (audio_duration_seconds <= 5)");
for (const r of rows.filter((r) => (r.audio_duration_seconds ?? 0) <= 5)) {
  const maxTs = maxTimestampSeconds(r.transcription_text ?? "");
  line(
    `- id=${r.id}  owner=${emailOf.get(r.user_id) ?? r.user_id}  dur=${r.audio_duration_seconds}s  credits=${r.credits_used}  ts=${r.has_timestamps}  created=${r.created_at}  textLen=${(r.transcription_text ?? "").length}  maxTimestamp=${maxTs ?? "n/a"}s`
  );
}

// ---- A.2 contamination: identical text under >1 distinct user ----
hr("A.2  Identical transcript text shared across DIFFERENT users (contamination signature)");
const byHash = new Map();
for (const r of rows) {
  const norm = (r.transcription_text ?? "").trim();
  if (!norm) continue;
  const h = createHash("md5").update(norm).digest("hex");
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(r);
}
let contaminationFound = false;
for (const [h, group] of byHash) {
  const users = new Set(group.map((r) => r.user_id));
  if (users.size > 1) {
    contaminationFound = true;
    line(`! hash=${h.slice(0, 12)}  rows=${group.length}  distinctUsers=${users.size}`);
    for (const r of group)
      line(`    id=${r.id} owner=${emailOf.get(r.user_id) ?? r.user_id} dur=${r.audio_duration_seconds}s created=${r.created_at}`);
  }
}
if (!contaminationFound) line("None — no transcript text is shared across different users.");

// ---- A.4 concurrency: different users created within the same second ----
hr("A.4  Rows from DIFFERENT users created in the same second");
const bySecond = new Map();
for (const r of rows) {
  const sec = (r.created_at ?? "").slice(0, 19);
  if (!bySecond.has(sec)) bySecond.set(sec, []);
  bySecond.get(sec).push(r);
}
let concFound = false;
for (const [sec, group] of bySecond) {
  const users = new Set(group.map((r) => r.user_id));
  if (group.length > 1 && users.size > 1) {
    concFound = true;
    line(`! ${sec}  rows=${group.length} users=${users.size}: ${[...users].map((u) => emailOf.get(u) ?? u).join(", ")}`);
  }
}
if (!concFound) line("None.");

// ---- A.5 systemic duration-vs-content mismatch ----
hr("A.5  Duration vs transcript max-timestamp mismatch (timestamped rows)");
const TOL = 5; // seconds of slack
const mismatches = [];
for (const r of rows) {
  if (!r.has_timestamps) continue;
  const maxTs = maxTimestampSeconds(r.transcription_text ?? "");
  if (maxTs === null) continue;
  const dur = r.audio_duration_seconds ?? 0;
  if (maxTs > dur + TOL) mismatches.push({ r, maxTs, dur, gap: maxTs - dur });
}
mismatches.sort((a, b) => b.gap - a.gap);
line(`Mismatched rows: ${mismatches.length}`);
for (const { r, maxTs, dur, gap } of mismatches) {
  line(`- id=${r.id} owner=${emailOf.get(r.user_id) ?? r.user_id} storedDur=${dur}s maxTimestamp=${maxTs}s gap=+${gap}s created=${r.created_at}`);
}

// ---- A.3 gemini_usage cross-check for owners of suspect rows ----
hr("A.3  gemini_usage for owners of short-duration / mismatched rows");
const suspectUsers = new Set([
  ...rows.filter((r) => (r.audio_duration_seconds ?? 0) <= 5).map((r) => r.user_id),
  ...mismatches.map((m) => m.r.user_id),
]);
for (const uid of suspectUsers) {
  const { data: usage } = await db
    .from("gemini_usage")
    .select("created_at, model, chunk_index, total_chunks, audio_seconds, total_tokens")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(15);
  line(`\nowner=${emailOf.get(uid) ?? uid}:`);
  if (!usage || usage.length === 0) line("  (no gemini_usage rows)");
  for (const u of usage ?? [])
    line(`  ${u.created_at}  audio_seconds=${u.audio_seconds}  chunk=${u.chunk_index}/${u.total_chunks}  tokens=${u.total_tokens}`);
}

// ---- Suspect row full text (the one in the screenshot) ----
hr("A.1b  Full text of short-duration rows (for manual inspection)");
for (const r of rows.filter((r) => (r.audio_duration_seconds ?? 0) <= 5)) {
  line(`\n--- id=${r.id} owner=${emailOf.get(r.user_id) ?? r.user_id} dur=${r.audio_duration_seconds}s ---`);
  line(r.transcription_text ?? "(empty)");
}

line("\nDone.");
