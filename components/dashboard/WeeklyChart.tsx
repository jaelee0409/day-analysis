"use client";

import { Card, PanelTitle } from "@/components/ui/primitives";
import type { DayTotals } from "@/lib/analytics";
import { formatDuration, formatWeekday } from "@/lib/time";

/**
 * One row per day. The full bar is everything recorded; the solid ink part
 * is focused work. Reading down the ink edge shows the week's rhythm without
 * needing a legend.
 */
export function WeeklyChart({
  days,
  todayKey,
  title = "Focused work this week",
}: {
  days: DayTotals[];
  todayKey?: string;
  title?: string;
}) {
  const peak = Math.max(60, ...days.map((d) => d.tracked));
  const focusedTotal = days.reduce((sum, day) => sum + day.productive, 0);

  return (
    <Card className="p-5">
      <PanelTitle aside={`${formatDuration(focusedTotal)} in total`}>{title}</PanelTitle>

      <div className="mt-4 space-y-2.5">
        {days.map((day) => {
          const isToday = day.date === todayKey;
          const other = Math.max(0, day.tracked - day.productive);
          return (
            <div key={day.date} className="grid grid-cols-[34px_1fr_58px] items-center gap-3">
              <span
                className={`text-[12px] ${isToday ? "font-semibold text-ink" : "text-muted"}`}
              >
                {formatWeekday(day.date)}
              </span>
              <div className="flex h-[14px] overflow-hidden rounded-[3px] bg-[#f1f3f3]">
                <div
                  className="h-full bg-ink transition-[width] duration-500 ease-out"
                  style={{ width: `${(day.productive / peak) * 100}%` }}
                />
                <div
                  className="h-full bg-[#d5d9d9] transition-[width] duration-500 ease-out"
                  style={{ width: `${(other / peak) * 100}%` }}
                />
              </div>
              <span className="text-right text-[12.5px] tabular-nums text-ink-soft">
                {day.productive > 0 ? formatDuration(day.productive) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 border-t border-hairline pt-3 text-[12px] text-faint">
        Solid marks focused work. The lighter run is everything else you recorded.
      </p>
    </Card>
  );
}
