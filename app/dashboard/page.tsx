"use client";

import { useEffect, useMemo, useState } from "react";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { RhythmPanel } from "@/components/dashboard/RhythmPanel";
import { TimeDistribution } from "@/components/dashboard/TimeDistribution";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { Card, EmptyState, PanelTitle, Segmented, Stat } from "@/components/ui/primitives";
import { rangeObservations, rangeTotals, rhythm } from "@/lib/analytics";
import { useToday } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { storage } from "@/lib/storage";
import { formatDuration, formatHours, recentKeys, weekKeys } from "@/lib/time";
import type { TimeBlock } from "@/types/time";

type RangeId = "week" | "7" | "30";

const RANGES: { value: RangeId; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

const RANGE_QUESTION: Record<RangeId, string> = {
  week: "Where did your week go?",
  "7": "Where did the last seven days go?",
  "30": "Where did the last month go?",
};

export default function DashboardPage() {
  const { dayStart, ready } = useSettings();
  const { key: todayKey, elapsed } = useToday();

  const [range, setRange] = useState<RangeId>("week");
  const [blocksByDay, setBlocksByDay] = useState<Record<string, TimeBlock[]>>({});

  const keys = useMemo(() => {
    if (range === "week") return weekKeys(todayKey);
    return recentKeys(todayKey, range === "7" ? 7 : 30);
  }, [range, todayKey]);

  useEffect(() => {
    storage.getBlocksForDays(keys).then(setBlocksByDay);
  }, [keys]);

  const totals = useMemo(() => {
    // Today is only as long as it has been so far; the rest is not yet lived.
    const elapsedByDay: Record<string, number> = {};
    for (const key of keys) {
      if (key > todayKey) elapsedByDay[key] = 0;
      else if (key === todayKey) elapsedByDay[key] = elapsed;
    }
    return rangeTotals(keys, blocksByDay, dayStart, elapsedByDay);
  }, [keys, blocksByDay, dayStart, todayKey, elapsed]);

  const spanMinutes = totals.days.reduce((sum, day) => sum + day.elapsed, 0);
  const unaccounted = Math.max(0, spanMinutes - totals.tracked);

  const observations = useMemo(
    () => rangeObservations(totals, blocksByDay, dayStart, spanMinutes),
    [totals, blocksByDay, dayStart, spanMinutes],
  );

  const weekChartDays = range === "week" ? totals.days : totals.days.slice(-7);

  const measures = useMemo(() => rhythm(keys, blocksByDay, dayStart), [keys, blocksByDay, dayStart]);

  if (!ready) return <div className="h-[60vh]" aria-hidden="true" />;

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-[13px] text-muted">
            {totals.activeDays} of {keys.length} days recorded
          </p>
          <h1 className="ask mt-1.5 text-[clamp(28px,4vw,38px)] text-ink">
            What does the pattern say?
          </h1>
        </div>
        <Segmented options={RANGES} value={range} onChange={setRange} label="Period" />
      </header>

      {totals.tracked === 0 ? (
        <EmptyState
          title="Nothing to analyse yet"
          body="The dashboard reads whatever you have recorded. Track a day or two and the totals, weekly rhythm, and observations fill in on their own."
        />
      ) : (
        <div className="grid gap-5">
          {/* The page's headline reading, so it takes the one filled panel. */}
          <Card tone="lead" className="p-5">
            <PanelTitle onInk aside={`${formatHours(spanMinutes)} elapsed`}>
              Overview
            </PanelTitle>
            <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Stat value={formatDuration(totals.tracked)} label="tracked" size="md" tone="inverse" />
              <Stat
                value={formatDuration(totals.productive)}
                label="focused work"
                size="md"
                tone="inverse"
              />
              <Stat
                value={formatDuration(Math.round(totals.tracked / Math.max(1, totals.activeDays)))}
                label="per recorded day"
                size="md"
                tone="inverse"
              />
              <Stat
                value={formatDuration(unaccounted)}
                label="unaccounted"
                size="md"
                tone="inverse-muted"
              />
            </div>

            <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-white/12">
              {totals.byCategory.map((entry) => (
                <div
                  key={entry.id}
                  title={`${entry.label} ${formatDuration(entry.minutes)}`}
                  style={{
                    width: `${(entry.minutes / Math.max(spanMinutes, 1)) * 100}%`,
                    background: entry.color,
                  }}
                />
              ))}
            </div>
            <p className="mt-2 text-[12px] text-white/40">
              The bar spans every hour in the period. The dark run at the end is time you did not record.
            </p>
          </Card>

          <div>
            <InsightCard
              question={RANGE_QUESTION[range]}
              spend={totals.byCategory}
              observations={observations}
            />
          </div>

          <RhythmPanel measures={measures} dayStart={dayStart} />

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <TimeDistribution
              totals={totals.byCategory}
              title="Total by category"
              aside={`${formatHours(totals.tracked)} tracked`}
            />
            <WeeklyChart
              days={weekChartDays}
              todayKey={todayKey}
              title={range === "week" ? "Focused work this week" : "Focused work, last 7 days"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
