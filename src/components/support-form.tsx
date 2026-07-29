"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useDictionary } from "@/lib/i18n/dictionary-context";

const SUPPORT_INBOX = "hi@helavoice.lk";

export function SupportForm() {
  const dict = useDictionary();
  const d = dict.support;

  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const loadedAt = useRef(Date.now());

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      subject: String(data.get("subject") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
      website: String(data.get("website") ?? ""),
      elapsedMs: Date.now() - loadedAt.current,
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      setError(d.errorValidation);
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        setStatus("idle");
        setError(body?.error ?? d.errorGeneric);
        return;
      }
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("idle");
      setError(d.errorGeneric);
    }
  };

  if (status === "sent") {
    return (
      <Card>
        <CardHeader>
          <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-500" />
          <CardTitle>{d.successTitle}</CardTitle>
          <CardDescription>{d.successBody}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setStatus("idle")}>
            {d.sendAnother}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="relative space-y-5">
          {/* Honeypot — hidden from humans, bots fill it and get silently dropped */}
          <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="support-name">{d.nameLabel}</Label>
              <Input id="support-name" name="name" maxLength={200} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">{d.emailLabel}</Label>
              <Input id="support-email" name="email" type="email" maxLength={320} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-subject">{d.subjectLabel}</Label>
            <Input id="support-subject" name="subject" maxLength={300} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-message">{d.messageLabel}</Label>
            <textarea
              id="support-message"
              name="message"
              maxLength={5000}
              required
              rows={6}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
              {error === d.errorGeneric && (
                <>{" "}<a href={`mailto:${SUPPORT_INBOX}`} className="font-medium underline">{SUPPORT_INBOX}</a></>
              )}
            </p>
          )}

          <Button type="submit" disabled={status === "sending"} className="w-full sm:w-auto">
            {status === "sending" ? d.sending : d.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
