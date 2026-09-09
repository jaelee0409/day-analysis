"use client";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { BarRow, Card, PanelTitle } from "@/components/ui/primitives";
import type { CategoryTotal } from "@/lib/analytics";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { formatDuration } from "@/lib/time";

/**
 * Where the time landed, ordered by size. Bars are measured against the
 * largest category rather than the total, so small categories stay readable
 * instead of collapsing into hairlines.
 *
 * This card always reads one day — Home's day, or a routine's — so it has no
 * scale to choose. The Dashboard's multi-day answer carries that toggle.
 */
export function TimeDistribution({
  totals,
  title,
  aside,
  emptyMessage,
}: {
  totals: CategoryTotal[];
  title: string;
  aside?: string;
  emptyMessage?: string;
}) {
  const { locale, t } = useLocale();
  const peak = totals[0]?.minutes ?? 0;

  return (
    <Card className="p-5">
      <PanelTitle aside={aside}>{title}</PanelTitle>

      {totals.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-muted">{emptyMessage ?? t("today.empty")}</p>
      ) : (
        <div className="mt-3 divide-y divide-hairline">
          {totals.map((entry) => (
            <BarRow
              key={entry.id}
              label={t(`category.${entry.id}.label` as MessageKey)}
              icon={<CategoryIcon id={entry.id} />}
              color={entry.color}
              minutesLabel={formatDuration(entry.minutes, locale)}
              meta={`${Math.round(entry.share * 100)}%`}
              fraction={peak > 0 ? entry.minutes / peak : 0}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
