"use client";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Card } from "@/components/ui/primitives";
import type { CategoryTotal, Observation } from "@/lib/analytics";
import { formatDuration } from "@/lib/time";

/**
 * The app asking its one question back to you, then answering it with the
 * numbers you recorded. The serif is reserved for the question; everything
 * below it is measurement.
 */
export function InsightCard({
  question = "Where did your day go?",
  spend,
  observations,
}: {
  question?: string;
  spend: CategoryTotal[];
  observations: Observation[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-6 pt-6">
        <h2 className="ask text-[26px] text-ink">{question}</h2>
      </div>

      <ul className="mt-5 px-6">
        {spend.slice(0, 6).map((entry) => (
          <li key={entry.id} className="flex items-baseline gap-3 border-t border-hairline py-2.5 first:border-t-0">
            <span className="shrink-0" style={{ color: entry.color }}>
              <CategoryIcon id={entry.id} />
            </span>
            <span className="figure w-[92px] shrink-0 text-[19px] font-medium text-ink">
              {formatDuration(entry.minutes)}
            </span>
            <span className="text-[13.5px] text-ink-soft">{entry.phrase}</span>
            <span
              className="ml-auto h-[6px] shrink-0 rounded-full"
              style={{ width: `${Math.max(entry.share * 88, 4)}px`, background: entry.color }}
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>

      {observations.length > 0 ? (
        <div className="mt-5 border-t border-line bg-[#fafbfb] px-6 py-5">
          <ul className="space-y-3">
            {observations.map((observation) => (
              <li key={observation.id} className="flex items-baseline gap-2.5 text-[13.5px] text-ink-soft">
                <span className="figure shrink-0 text-[17px] font-semibold text-ink">{observation.figure}</span>
                <span>{observation.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
