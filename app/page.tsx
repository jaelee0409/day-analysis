"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LocalArchiveNotice } from "@/components/auth/LocalArchiveNotice";
import { DailySummary } from "@/components/dashboard/DailySummary";
import { ObservationList } from "@/components/dashboard/ObservationList";
import { TimeDistribution } from "@/components/dashboard/TimeDistribution";
import { Timeline } from "@/components/timeline/Timeline";
import { TodoList } from "@/components/todo/TodoList";
import { DayPicker } from "@/components/ui/DayPicker";
import { dayObservations, dayTotals, rangeTotals } from "@/lib/analytics";
import { useDay, useToday } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import { useSettings } from "@/lib/settings-context";
import { storage } from "@/lib/storage";
import { MINUTES_PER_DAY, blockRange, recentKeys, snap } from "@/lib/time";
import type { TimeBlock } from "@/types/time";

/**
 * One day at a time, whichever day you choose.
 *
 * This used to be Today, with a separate History for everything else. The
 * only thing History added was picking a different date, which a calendar
 * does better and in one place — so the date at the top is the control, and
 * the rest of the page follows it.
 */
export default function HomePage() {
  const { settings, ready } = useSettings();
  const { t } = useLocale();
  const { key: todayKey, elapsed: todayElapsed, dayStart } = useToday();

  const [date, setDate] = useState<string | null>(null);
  const key = date ?? todayKey;
  const isToday = key === todayKey;
  const elapsed = isToday ? todayElapsed : MINUTES_PER_DAY;

  const { blocks, addBlock, editBlock, removeBlock } = useDay(key);

  const [openAt, setOpenAt] = useState<{ start: number; end: number; token: number } | null>(null);
  const [priorDays, setPriorDays] = useState<Record<string, TimeBlock[]>>({});
  const [tracked, setTracked] = useState<Set<string>>(new Set());

  /* The seven days before this one, used only to say whether it is unusual. */
  useEffect(() => {
    const keys = recentKeys(key, 8).slice(0, 7);
    storage.getBlocksForDays(keys, dayStart).then(setPriorDays);
  }, [key, dayStart, blocks.length]);

  /* Which days the calendar should mark. */
  useEffect(() => {
    storage.getTrackedDays().then((days) => setTracked(new Set(days)));
  }, [blocks.length]);

  /**
   * The recorder opens where your recording stopped, so pressing R fills the
   * gap you actually left rather than starting a fresh guess. On a past day
   * there is no "now", so it picks up after the last block instead.
   */
  const recordNow = useCallback(() => {
    const interval = settings.interval;
    const reach = isToday ? Math.min(snap(elapsed, interval) + interval, MINUTES_PER_DAY) : MINUTES_PER_DAY;
    const lastEnd = blocks.reduce((latest, block) => Math.max(latest, blockRange(block, dayStart).end), 0);
    const continues = lastEnd > 0 && lastEnd < reach && reach - lastEnd <= 180;
    const start = continues ? lastEnd : isToday ? snap(elapsed, interval) : lastEnd;
    setOpenAt({ start, end: Math.min(start + interval, MINUTES_PER_DAY), token: Date.now() });
  }, [blocks, dayStart, elapsed, isToday, settings.interval]);

  /* One shortcut, for the thing the page exists to do. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (document.querySelector("[role='dialog']")) return;
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        recordNow();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [recordNow]);

  const totals = useMemo(() => dayTotals(key, blocks, dayStart, elapsed), [key, blocks, dayStart, elapsed]);

  const observations = useMemo(() => {
    const priorKeys = Object.keys(priorDays);
    const prior = rangeTotals(priorKeys, priorDays, dayStart);
    return dayObservations(
      totals,
      blocks,
      dayStart,
      prior.activeDays >= 2
        ? { averageProductive: prior.productive / prior.activeDays }
        : undefined,
    ).slice(0, 4);
  }, [totals, blocks, dayStart, priorDays]);

  if (!ready) {
    return <div className="h-[60vh]" aria-hidden="true" />;
  }

  return (
    <div>
      <LocalArchiveNotice onImported={() => window.location.reload()} />

      <header className="mb-7">
        <DayPicker value={key} today={todayKey} tracked={tracked} onChange={setDate} />
        <h1 className="ask mt-1.5 text-[clamp(28px,4vw,38px)] text-ink">{t("today.question")}</h1>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_352px]">
        <Timeline
          key={key}
          date={key}
          blocks={blocks}
          interval={settings.interval}
          dayStart={dayStart}
          categories={settings.enabledCategories}
          nowOffset={isToday ? elapsed : null}
          onCreate={addBlock}
          onUpdate={editBlock}
          onDelete={removeBlock}
          openAt={openAt}
          focusOnLoad={isToday}
        />

        <div className="grid gap-5">
          <DailySummary totals={totals} blocks={blocks} dayStart={dayStart} />
          <TodoList />
          {/* The observations live under the bars rather than in a card of
              their own, which would print the same categories twice. */}
          <TimeDistribution
            totals={totals.byCategory}
            title={t("today.landed")}
            aside={
              blocks.length > 0
                ? t(blocks.length === 1 ? "today.block" : "today.blocks", { count: blocks.length })
                : undefined
            }
            emptyMessage={t("today.empty")}
            footer={
              observations.length > 0 ? <ObservationList observations={observations} /> : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
