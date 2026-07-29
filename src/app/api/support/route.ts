import { createClient } from "@/lib/supabase/server";
import { privateJson } from "@/lib/api-response";

const SUPPORT_INBOX = "hi@helavoice.lk";
const SENDER = { name: "HelaVoice", email: "no-reply@helavoice.lk" };
const LIMITS = { name: 200, email: 320, subject: 300, message: 5000 };
const MIN_ELAPSED_MS = 3000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    website?: string;
    elapsedMs?: number;
  };

  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot: bots fill the hidden "website" field. Pretend success so they
  // don't learn the field is a trap.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return privateJson({ success: true });
  }

  // Bot friction: humans take longer than 3s from page load to submit.
  if (typeof body.elapsedMs !== "number" || body.elapsedMs < MIN_ELAPSED_MS) {
    return privateJson({ error: "Submission rejected" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!name || !email || !subject || !message) {
    return privateJson({ error: "All fields are required" }, { status: 400 });
  }

  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    subject.length > LIMITS.subject ||
    message.length > LIMITS.message
  ) {
    return privateJson({ error: "A field exceeds its maximum length" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return privateJson({ error: "Invalid email address" }, { status: 400 });
  }

  // Best-effort context: if the visitor is logged in, include their account
  // details so support can link the message to the user. Never required.
  let userContext = "";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userContext = `<p><strong>Logged-in user:</strong> ${escapeHtml(user.id)} (${escapeHtml(user.email ?? "no email")})</p>`;
    }
  } catch {
    // Anonymous submission — fine.
  }

  const htmlContent = [
    `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>`,
    `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>`,
    userContext,
    `<hr />`,
    `<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
  ].join("\n");

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    // Local dev without the secret: log instead of sending so the form flow
    // stays testable end-to-end.
    console.log("[support] BREVO_API_KEY not set — would send:", {
      name,
      email,
      subject,
      messageLength: message.length,
    });
    return privateJson({ success: true });
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: SUPPORT_INBOX, name: "HelaVoice Support" }],
      replyTo: { email, name },
      subject: `[Support] ${subject}`,
      htmlContent,
    }),
  });

  if (!res.ok) {
    console.error("[support] Brevo send failed:", res.status, await res.text());
    return privateJson({ error: "Failed to send message" }, { status: 502 });
  }

  return privateJson({ success: true });
}
