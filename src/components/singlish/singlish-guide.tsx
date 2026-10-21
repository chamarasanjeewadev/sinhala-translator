// Singlish key reference — mirrors the scheme in lib/singlish.ts. Server-safe so
// the tool page can render it as indexable HTML.

export const SINGLISH_GUIDE: { roman: string; sinhala: string }[] = [
  { roman: "a aa A AA", sinhala: "අ ආ ඇ ඈ" },
  { roman: "i ii u uu", sinhala: "ඉ ඊ උ ඌ" },
  { roman: "e ee o oo", sinhala: "එ ඒ ඔ ඕ" },
  { roman: "ai au", sinhala: "ඓ ඖ" },
  { roman: "ka kaa ki ku", sinhala: "ක කා කි කු" },
  { roman: "ke ko kae", sinhala: "කෙ කො කැ" },
  { roman: "k (no vowel)", sinhala: "ක්" },
  { roman: "th dh", sinhala: "ත ද" },
  { roman: "t d", sinhala: "ට ඩ" },
  { roman: "n N", sinhala: "න ණ" },
  { roman: "l L", sinhala: "ල ළ" },
  { roman: "s sh Sh", sinhala: "ස ශ ෂ" },
  { roman: "ch j", sinhala: "ච ජ" },
  { roman: "w / v", sinhala: "ව" },
  { roman: "kh gh bh ph", sinhala: "ඛ ඝ භ ඵ" },
  { roman: "zg zdh zd zb", sinhala: "ඟ ඳ ඬ ඹ" },
  { roman: "gn", sinhala: "ඥ" },
  { roman: "x H", sinhala: "ං ඃ" },
  { roman: "kra thra", sinhala: "ක්‍ර ත්‍ර" },
  { roman: "kya vidhyaa", sinhala: "ක්‍ය විද්‍යා" },
];

export const SINGLISH_EXAMPLES: { roman: string; sinhala: string }[] = [
  { roman: "mama gedhara yanavaa", sinhala: "මම ගෙදර යනවා" },
  { roman: "oyaata kohomadha?", sinhala: "ඔයාට කොහොමද?" },
  { roman: "shrii laxkaava", sinhala: "ශ්‍රී ලංකාව" },
  { roman: "subha upandhinayak", sinhala: "සුභ උපන්දිනයක්" },
];

export function SinglishGuideGrid({
  compact = false,
  className = "",
  romanClassName = "",
  sinhalaClassName = "",
}: {
  /** Two columns at most — for narrow panes like the dashboard editor. */
  compact?: boolean;
  className?: string;
  romanClassName?: string;
  sinhalaClassName?: string;
}) {
  return (
    <dl
      className={`grid gap-x-5 gap-y-1.5 ${
        compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      } ${className}`}
    >
      {SINGLISH_GUIDE.map(({ roman, sinhala }) => (
        <div key={roman} className="flex items-baseline justify-between gap-3 min-w-0">
          <dt className={`font-mono text-xs whitespace-nowrap ${romanClassName}`}>{roman}</dt>
          <dd className={`sinhala-text text-sm leading-snug whitespace-nowrap ${sinhalaClassName}`}>{sinhala}</dd>
        </div>
      ))}
    </dl>
  );
}
