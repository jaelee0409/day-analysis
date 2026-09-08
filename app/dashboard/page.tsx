"use client";

import { useEffect, useMemo, useState } from "react";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { RhythmPanel } from "@/components/dashboard/RhythmPanel";
import { TimeDistribution } from "@/components/dashboard/TimeDistribution";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { Card, EmptyState, PanelTitle, Segmented, Stat } from "@/components/ui/primitives";
import { rangeObservations, rangeTotals, rhythm } from "@/lib/analytics";
import { useToday } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import { useSettings } from "@/lib/settings-context";
import { storage } from "@/lib/storage";
import type { MessageKey } from "@/lib/i18n";
import { formatDuration, formatHours, recentKeys } from "@/lib/time";
import type { TimeBlock } from "@/types/time";

type RangeId = "7" | "30" | "life";

const RANGE_LABEL: Record<RangeId, MessageKey> = {
  "7": "dashboard.last7",
  "30": "dashboard.last30",
  life: "dashboard.lifetime",
};

const RANGE_QUESTION: Record<RangeId, MessageKey> = {
  "7": "dashboard.sevenQuestion",
  "30": "dashboard.monthQuestion",
  life: "dashboard.lifetimeQuestion",
};

export default function DashboardPage() {
  const { dayStart, ready } = useSettings();
  const { locale, t } = useLocale();
  const { key: todayKey, elapsed } = useToday();

  const [range, setRange] = useState<RangeId>("7");
  const [trackedDays, setTrackedDays] = useState<string[]>([]);
  const [blocksByDay, setBlocksByDay] = useState<Record<string, TimeBlock[]>>({});
  const [daysTracked, setDaysTracked] = useState<number | null>(null);

  // All time means every day actually recorded, oldest first, because the
  // rhythm measures read a night from the day before it.
  const keys = useMemo(() => {
    if (range === "life") return [...trackedDays].sort();
    return recentKeys(todayKey, range === "7" ? 7 : 30);
  }, [range, todayKey, trackedDays]);

  // dayStart was read here but missing from the deps, so changing the day
  // start left this page showing the old buckets until a reload.
  useEffect(() => {
    storage.getBlocksForDays(keys, dayStart).then(setBlocksByDay);
  }, [keys, dayStart]);

  // Every day ever recorded, not only the ones in view: the number that says
  // how long you have kept this up.
  useEffect(() => {
    storage.getTrackedDays().then((days) => {
      setTrackedDays(days);
      setDaysTracked(days.length);
    });
  }, [blocksByDay]);

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

  const weekChartDays = totals.days.slice(-7);

  const measures = useMemo(() => rhythm(keys, blocksByDay, dayStart), [keys, blocksByDay, dayStart]);

  if (!ready) return <div className="h-[60vh]" aria-hidden="true" />;

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-[13px] text-muted">
            {t("dashboard.daysOf", { active: totals.activeDays, total: keys.length })}
          </p>
          <h1 className="ask mt-1.5 text-[clamp(28px,4vw,38px)] text-ink">{t("dashboard.question")}</h1>
        </div>
        <Segmented
          options={(["7", "30", "life"] as RangeId[]).map((value) => ({
            value,
            label: t(RANGE_LABEL[value]),
          }))}
          value={range}
          onChange={setRange}
          label={t("dashboard.period")}
        />
      </header>

      {totals.tracked === 0 ? (
        <EmptyState
          title={t("dashboard.emptyTitle")}
          body={t("dashboard.emptyBody")}
        />
      ) : (
        <div className="grid gap-5">
          {/* The page's headline reading, so it takes the one filled panel. */}
          <Card tone="lead" className="p-5">
            <PanelTitle onInk aside={t("dashboard.elapsed", { hours: formatHours(spanMinutes, locale) })}>
              {t("dashboard.overview")}
            </PanelTitle>
            <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
              <Stat
                value={formatDuration(totals.tracked, locale)}
                label={t("today.tracked")}
                size="md"
                tone="inverse"
              />
              <Stat
                value={formatDuration(totals.productive, locale)}
                label={t("today.focused")}
                size="md"
                tone="inverse"
              />
              <Stat
                value={formatDuration(Math.round(totals.tracked / Math.max(1, totals.activeDays)), locale)}
                label={t("dashboard.perDay")}
                size="md"
                tone="inverse"
              />
              <Stat
                value={formatDuration(unaccounted, locale)}
                label={t("today.unaccounted")}
                size="md"
                tone="inverse-muted"
              />
              <Stat
                value={daysTracked === null ? "—" : String(daysTracked)}
                label={t("dashboard.daysTracked")}
                size="md"
                tone="inverse"
              />
            </div>

            <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-white/12">
              {totals.byCategory.map((entry) => (
                <div
                  key={entry.id}
                  title={`${t(`category.${entry.id}.label` as MessageKey)} ${formatDuration(entry.minutes, locale)}`}
                  style={{
                    width: `${(entry.minutes / Math.max(spanMinutes, 1)) * 100}%`,
                    background: entry.color,
                  }}
                />
              ))}
            </div>
            <p className="mt-2 text-[12px] text-white/40">{t("dashboard.barNote")}</p>
          </Card>

          <div>
            <InsightCard
              question={t(RANGE_QUESTION[range])}
              spend={totals.byCategory}
              observations={observations}
            />
          </div>

          <RhythmPanel measures={measures} dayStart={dayStart} />

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <TimeDistribution
              totals={totals.byCategory}
              title={t("dashboard.byCategory")}
              aside={t("dashboard.trackedAside", { hours: formatHours(totals.tracked, locale) })}
              recordedDays={totals.activeDays}
            />
            <WeeklyChart
              days={weekChartDays}
              todayKey={todayKey}
              title={t("chart.focusedSeven")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
