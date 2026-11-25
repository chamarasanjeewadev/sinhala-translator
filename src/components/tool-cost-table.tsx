import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FREE_TOOLS, PAID_TOOLS, IconTile, CostBadge, costNote } from "@/components/tool-catalog";
import { localePath } from "@/lib/i18n/utils";
import type { Locale } from "@/lib/i18n/config";

/**
 * Every tool, split into free and paid, with what each costs. Server-safe (no hooks),
 * so it renders crawlable links on the home page and inside the client pricing page.
 */
export function ToolCostTable({
  locale,
  nav,
  translateNote,
  siEnLabel,
}: {
  locale: Locale;
  /** dict.navbar */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nav: any;
  translateNote: string;
  siEnLabel: string;
}) {
  const lp = (href: string) => localePath(href, locale).replace(/(.)\/$/, "$1");
  const groups = [
    { title: nav.freeGroup as string, tools: FREE_TOOLS, cost: "free" as const },
    { title: nav.paidGroup as string, tools: PAID_TOOLS, cost: "credits" as const },
  ];

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title} className="rounded-2xl border border-ink/10 bg-white p-2 sm:p-3">
            <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-2">
              <h3 className="font-display text-lg font-bold text-ink">{g.title}</h3>
              <CostBadge cost={g.cost} labels={nav} />
            </div>
            <ul>
              {g.tools.map((tool) => (
                <li key={tool.key} className="border-t border-ink/[0.07] first:border-t-0">
                  <Link
                    href={lp(tool.href)}
                    className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[#f3f7f2]"
                  >
                    <IconTile icon={tool.icon} tone={tool.tone} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink">
                        {nav[tool.key]}
                        {tool.cost === "trial" && <CostBadge cost="trial" labels={nav} />}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink/65">{costNote(nav, tool.key)}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink/35 transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                  {tool.key === "translate" && (
                    <Link
                      href={lp("/sinhala-to-english")}
                      className="mb-2 ml-[4.25rem] inline-block text-sm font-medium text-leaf underline-offset-4 hover:underline"
                    >
                      {siEnLabel} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink/60">{translateNote}</p>
    </div>
  );
}
