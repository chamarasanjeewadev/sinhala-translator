"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/utils";
import type { CreditPackage } from "@/lib/types";

interface PricingCardProps {
  pack: CreditPackage;
}

export function PricingCard({ pack }: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const dict = useDictionary();
  const locale = useLocale();
  const d = dict.pricing;

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pack.id, locale }),
      });

      const data: { url?: string; error?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || d.checkoutError);
      }
    } catch {
      alert(d.genericError);
    } finally {
      setLoading(false);
    }
  };

  const pricePerCredit = (pack.price / 100 / pack.credits).toFixed(2);

  return (
    <Card className={pack.popular ? "border-primary shadow-md" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{pack.name}</CardTitle>
          {pack.popular && <Badge>{d.mostPopular}</Badge>}
        </div>
        <CardDescription>
          {t(d.transcriptionCredits, { count: pack.credits })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-3xl font-bold">{pack.priceDisplay}</span>
          <span className="text-muted-foreground ml-1">{d.oneTime}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(d.perCredit, { price: pricePerCredit })}
        </p>
        <Button
          className="w-full"
          variant={pack.popular ? "default" : "outline"}
          onClick={handleBuy}
          disabled={loading}
        >
          {loading ? d.redirecting : d.buyButton}
        </Button>
      </CardContent>
    </Card>
  );
}
