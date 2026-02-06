"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/i18n/dictionary-context";

interface TranscriptionDisplayProps {
  text: string;
}

export function TranscriptionDisplay({ text }: TranscriptionDisplayProps) {
  const [copied, setCopied] = useState(false);
  const dict = useDictionary();
  const d = dict.transcription;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{d.title}</h3>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? d.copied : d.copy}
        </Button>
      </div>
      <div className="min-h-[120px] rounded-md border bg-muted/50 p-4">
        <p className="text-base leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
