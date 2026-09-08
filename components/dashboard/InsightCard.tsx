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
  // The card sits in a 352px rail on Today and across the full width on the
  // Dashboard, so it measures its own box rather than the viewport: stacked
  // when narrow, spend beside observations when there is room.
  return (
    <Card className="@container overflow-hidden">
      <div className="px-6 pt-6">
        <h2 className="ask text-[26px] text-ink">{question}</h2>
      </div>

      <div className="@min-[720px]:grid @min-[720px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @min-[720px]:items-start">
      <ul className="mt-5 px-6 @min-[720px]:mb-6">
        {/* Every category that holds time. A cap here silently drops the
            smallest ones, which makes the answer to the question wrong. */}
        {spend.map((entry) => (
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
        <div className="mt-5 border-t border-line bg-[#fafbfb] px-6 py-5 @min-[720px]:mt-5 @min-[720px]:border-l @min-[720px]:border-t-0 @min-[720px]:self-stretch">
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
      </div>
    </Card>
  );
}
