"use client";

import { useState } from "react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Card, Segmented } from "@/components/ui/primitives";
import type { CategoryTotal } from "@/lib/analytics";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { formatDuration } from "@/lib/time";

/**
 * The app asking its one question back to you, then answering it with the
 * numbers you recorded. The serif is reserved for the question; everything
 * below it is measurement.
 *
 * A period long enough to have days in it can be read two ways — everything
 * it holds, or what a single day of it looked like — so the scale is a toggle
 * on the answer rather than a second card printing the same categories again.
 */
export function InsightCard({
  question,
  spend,
  recordedDays = 0,
}: {
  question: string;
  spend: CategoryTotal[];
  /** Recorded days behind these totals. Above one, a per-day scale is offered. */
  recordedDays?: number;
}) {
  const { locale, t } = useLocale();
  const [perDay, setPerDay] = useState(false);
  const canAverage = recordedDays > 1;
  const divisor = canAverage && perDay ? recordedDays : 1;

  // The card sits in a 352px rail on Today and across the full width on the
  // Dashboard, so it measures its own box rather than the viewport.
  return (
    <Card className="@container overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 pt-6">
        <div>
          <h2 className="ask text-[26px] text-ink">{question}</h2>
          {/* Only the per-day scale has anything to say here, but the line
              holds its height either way: a note that appears on one setting
              and not the other would shove the card every time you switch.
              The line-height is stated so the empty box and the filled one
              measure the same in both languages. */}
          {canAverage ? (
            <p className="mt-1 h-[18px] text-[12px] leading-[18px] text-faint">
              {perDay ? t("dist.perDayAside", { days: recordedDays }) : ""}
            </p>
          ) : null}
        </div>
        {canAverage && spend.length > 0 ? (
          <Segmented
            options={[
              { value: "total", label: t("dist.total") },
              { value: "day", label: t("dist.perDay") },
            ]}
            value={perDay ? "day" : "total"}
            onChange={(value) => setPerDay(value === "day")}
            label={t("dist.scale")}
          />
        ) : null}
      </div>

      {/* Every category that holds time. A cap here silently drops the
          smallest ones, which makes the answer to the question wrong.
          Columns rather than a grid: the list is ordered by size, and a grid
          would deal it across the two columns so the second-largest sat
          beside the largest instead of beneath it. */}
      <ul className="mt-5 px-6 pb-5 @min-[720px]:columns-2 @min-[720px]:gap-x-9">
        {spend.map((entry) => (
          <li
            key={entry.id}
            className="flex break-inside-avoid items-baseline gap-3 border-t border-hairline py-2.5"
          >
            <span className="shrink-0" style={{ color: entry.color }}>
              <CategoryIcon id={entry.id} />
            </span>
            <span className="figure w-[92px] shrink-0 text-[19px] font-medium text-ink">
              {formatDuration(Math.round(entry.minutes / divisor), locale)}
            </span>
            <span className="text-[13.5px] text-ink-soft">
              {t(`category.${entry.id}.phrase` as MessageKey)}
            </span>
            <span
              className="ml-auto h-[6px] shrink-0 rounded-full"
              style={{ width: `${Math.max(entry.share * 88, 4)}px`, background: entry.color }}
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
