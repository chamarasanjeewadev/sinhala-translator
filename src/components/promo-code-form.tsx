"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { t } from "@/lib/i18n/utils";
import { trackEvent } from "@/lib/analytics";

// Redeems database promo codes (redeem_promo_code RPC) on the web; Stripe
// promotion codes are still entered at checkout.
export function PromoCodeForm({ onRedeemed }: { onRedeemed: (credits: number) => void }) {
  const d = useDictionary().dashboard;
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted-ink underline hover:text-ink"
      >
        {d.promoHave}
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/credits/redeem-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { credits?: number; error?: string };
      if (!res.ok || typeof data.credits !== "number") {
        toast.error(data.error ?? d.promoFailed);
        return;
      }
      trackEvent("promo_redeemed", {});
      onRedeemed(data.credits);
      setCode("");
      setOpen(false);
      toast.success(t(d.promoApplied, { credits: data.credits }));
    } catch {
      toast.error(d.promoFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={d.promoPlaceholder}
        aria-label={d.promoPlaceholder}
        autoFocus
        className="w-40 rounded-full border border-paper-3 bg-white px-4 py-2 text-sm uppercase text-ink outline-none focus:border-ink"
      />
      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        {d.promoApply}
      </button>
    </form>
  );
}
