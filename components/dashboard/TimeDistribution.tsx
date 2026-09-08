"use client";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useState } from "react";
import { BarRow, Card, PanelTitle, Segmented } from "@/components/ui/primitives";
import type { CategoryTotal } from "@/lib/analytics";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { formatDuration } from "@/lib/time";

/**
 * Where the time landed, ordered by size. Bars are measured against the
 * largest category rather than the total, so small categories stay readable
 * instead of collapsing into hairlines.
 */
export function TimeDistribution({
  totals,
  title,
  aside,
  emptyMessage,
  recordedDays = 0,
}: {
  totals: CategoryTotal[];
  title: string;
  aside?: string;
  emptyMessage?: string;
  /** Recorded days behind these totals. Above one, a per-day scale is offered. */
  recordedDays?: number;
}) {
  const { locale, t } = useLocale();
  const [perDay, setPerDay] = useState(false);
  const canAverage = recordedDays > 1;
  const divisor = canAverage && perDay ? recordedDays : 1;
  const peak = totals[0]?.minutes ?? 0;

  return (
    <Card className="p-5">
      <PanelTitle aside={canAverage && perDay ? t("dist.perDayAside", { days: recordedDays }) : aside}>
        {title}
      </PanelTitle>

      {canAverage && totals.length > 0 ? (
        <div className="mt-3">
          <Segmented
            options={[
              { value: "total", label: t("dist.total") },
              { value: "day", label: t("dist.perDay") },
            ]}
            value={perDay ? "day" : "total"}
            onChange={(value) => setPerDay(value === "day")}
            label={t("dist.scale")}
          />
        </div>
      ) : null}

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
              minutesLabel={formatDuration(Math.round(entry.minutes / divisor), locale)}
              meta={`${Math.round(entry.share * 100)}%`}
              fraction={peak > 0 ? entry.minutes / peak : 0}
            />
          ))}
        </div>
      )}

    </Card>
  );
}
