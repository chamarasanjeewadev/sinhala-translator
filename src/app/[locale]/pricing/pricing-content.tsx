"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PricingCard } from "@/components/pricing-card";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { toast } from "sonner";

export function PricingContent() {
  const searchParams = useSearchParams();
  const dict = useDictionary();
  const d = dict.pricing;

  useEffect(() => {
    if (searchParams.get("payment") === "cancelled") {
      toast.info(d.paymentCancelled);
    }
  }, [searchParams, d.paymentCancelled]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{d.title}</h1>
        <p className="mt-2 text-muted-foreground">{d.subtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {CREDIT_PACKAGES.map((pack) => (
          <PricingCard key={pack.id} pack={pack} />
        ))}
      </div>
    </div>
  );
}
