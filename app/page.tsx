"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DailySummary } from "@/components/dashboard/DailySummary";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { TimeDistribution } from "@/components/dashboard/TimeDistribution";
import { Timeline } from "@/components/timeline/Timeline";
import { TodoList } from "@/components/todo/TodoList";
import { dayObservations, dayTotals, rangeTotals } from "@/lib/analytics";
import { useDay, useToday } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { storage } from "@/lib/storage";
import { MINUTES_PER_DAY, blockRange, formatDayLong, recentKeys, snap } from "@/lib/time";
import type { TimeBlock } from "@/types/time";

export default function TodayPage() {
  const { settings, ready } = useSettings();
  const { key, elapsed, dayStart } = useToday();
  const { blocks, addBlock, editBlock, removeBlock } = useDay(key);

  const [openAt, setOpenAt] = useState<{ start: number; end: number; token: number } | null>(null);
  const [priorDays, setPriorDays] = useState<Record<string, TimeBlock[]>>({});

  /* The seven days before today, used only to say whether today is unusual. */
  useEffect(() => {
    const keys = recentKeys(key, 8).slice(0, 7);
    storage.getBlocksForDays(keys).then(setPriorDays);
  }, [key, blocks.length]);

  /**
   * The recorder opens where your recording stopped, so pressing R fills the
   * gap you actually left rather than starting a fresh guess. If the gap has
   * grown past three hours it is more likely a break in tracking than one
   * long activity, so it falls back to the slot you are in now.
   */
  const recordNow = useCallback(() => {
    const interval = settings.interval;
    const currentSlotEnd = Math.min(snap(elapsed, interval) + interval, MINUTES_PER_DAY);
    const lastEnd = blocks.reduce((latest, block) => Math.max(latest, blockRange(block, dayStart).end), 0);
    const continues = lastEnd > 0 && lastEnd < currentSlotEnd && currentSlotEnd - lastEnd <= 180;
    const start = continues ? lastEnd : snap(elapsed, interval);
    setOpenAt({ start, end: Math.max(start + interval, currentSlotEnd), token: Date.now() });
  }, [blocks, dayStart, elapsed, settings.interval]);

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
    const activeDays = prior.activeDays;
    return dayObservations(
      totals,
      blocks,
      dayStart,
      activeDays >= 2
        ? { averageProductive: prior.productive / activeDays, label: "recent" }
        : undefined,
    ).slice(0, 4);
  }, [totals, blocks, dayStart, priorDays]);

  if (!ready) {
    return <div className="h-[60vh]" aria-hidden="true" />;
  }

  return (
    <div>
      <header className="mb-7">
        <p className="text-[13px] text-muted">{formatDayLong(key)}</p>
        <h1 className="ask mt-1.5 text-[clamp(28px,4vw,38px)] text-ink">How did you spend your day?</h1>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_352px]">
        <Timeline
          date={key}
          blocks={blocks}
          interval={settings.interval}
          dayStart={dayStart}
          categories={settings.enabledCategories}
          nowOffset={elapsed}
          onCreate={addBlock}
          onUpdate={editBlock}
          onDelete={removeBlock}
          openAt={openAt}
          focusOnLoad
        />

        <div className="grid gap-5">
          <DailySummary totals={totals} blocks={blocks} dayStart={dayStart} />
          <TodoList />
          <TimeDistribution
            totals={totals.byCategory}
            title="Where the time landed"
            aside={blocks.length > 0 ? `${blocks.length} ${blocks.length === 1 ? "block" : "blocks"}` : undefined}
            emptyMessage="Click any empty slot on the timeline to record your first block."
          />
          {totals.byCategory.length > 0 ? (
            <InsightCard spend={totals.byCategory} observations={observations} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
