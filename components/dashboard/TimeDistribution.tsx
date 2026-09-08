"use client";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { BarRow, Card, PanelTitle } from "@/components/ui/primitives";
import type { CategoryTotal } from "@/lib/analytics";
import { formatDuration } from "@/lib/time";

/**
 * Where the time landed, ordered by size. Bars are measured against the
 * largest category rather than the total, so small categories stay readable
 * instead of collapsing into hairlines.
 */
export function TimeDistribution({
  totals,
  title = "Breakdown",
  aside,
  emptyMessage = "Nothing recorded yet.",
}: {
  totals: CategoryTotal[];
  title?: string;
  aside?: string;
  emptyMessage?: string;
}) {
  const peak = totals[0]?.minutes ?? 0;

  return (
    <Card className="p-5">
      <PanelTitle aside={aside}>{title}</PanelTitle>

      {totals.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-3 divide-y divide-hairline">
          {totals.map((entry) => (
            <BarRow
              key={entry.id}
              label={entry.label}
              icon={<CategoryIcon id={entry.id} />}
              color={entry.color}
              minutesLabel={formatDuration(entry.minutes)}
              meta={`${Math.round(entry.share * 100)}%`}
              fraction={peak > 0 ? entry.minutes / peak : 0}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
