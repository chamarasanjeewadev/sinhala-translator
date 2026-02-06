"use client";

import { Badge } from "@/components/ui/badge";
import { useDictionary } from "@/lib/i18n/dictionary-context";

interface CreditBalanceProps {
  credits: number;
}

export function CreditBalance({ credits }: CreditBalanceProps) {
  const dict = useDictionary();
  const d = dict.credits;

  return (
    <Badge variant={credits > 0 ? "default" : "destructive"}>
      {credits} {credits !== 1 ? d.credits : d.credit}
    </Badge>
  );
}
