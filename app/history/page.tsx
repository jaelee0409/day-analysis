"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DailySummary } from "@/components/dashboard/DailySummary";
import { TimeDistribution } from "@/components/dashboard/TimeDistribution";
import { Timeline } from "@/components/timeline/Timeline";
import { Card, EmptyState } from "@/components/ui/primitives";
import { category } from "@/lib/categories";
import { dayTotals } from "@/lib/analytics";
import { useDay, useToday } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { storage } from "@/lib/storage";
import {
  MINUTES_PER_DAY,
  blockRange,
  formatDayLong,
  formatDayShort,
  formatDuration,
  formatWeekday,
} from "@/lib/time";
import type { TimeBlock } from "@/types/time";

export default function HistoryPage() {
  const { settings, dayStart, ready } = useSettings();
  const { key: todayKey, elapsed } = useToday();

  const [days, setDays] = useState<string[]>([]);
  const [blocksByDay, setBlocksByDay] = useState<Record<string, TimeBlock[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [scrollable, setScrollable] = useState(false);
  const stripRef = useRef<HTMLUListElement>(null);

  const load = useCallback(async () => {
    const tracked = await storage.getTrackedDays();
    const keys = tracked.includes(todayKey) ? tracked : [todayKey, ...tracked];
    setDays(keys);
    setBlocksByDay(await storage.getBlocksForDays(keys, dayStart));
    setSelected((current) => current ?? keys[0] ?? todayKey);
  }, [todayKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeKey = selected ?? todayKey;
  const { blocks, addBlock, editBlock, removeBlock } = useDay(activeKey);

  const onMutate = useCallback(
    async (run: () => Promise<void>) => {
      await run();
      await load();
    },
    [load],
  );

  /* Once there are more days than fit, the strip has to bring the selected one
     into view and say that it scrolls at all. */
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const measure = () => setScrollable(strip.scrollWidth > strip.clientWidth + 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [days.length]);

  useEffect(() => {
    const strip = stripRef.current;
    const card = strip?.querySelector<HTMLElement>('[data-active="true"]');
    if (!strip || !card) return;
    strip.scrollTo({
      left: Math.max(0, card.offsetLeft - strip.clientWidth / 2 + card.clientWidth / 2),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [activeKey, days.length]);

  /* Arrow keys walk the strip, which beats dragging through a long scroll. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (document.querySelector("[role='dialog']")) return;
      const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      if (step === 0) return;
      const index = days.indexOf(activeKey);
      const next = days[index + step];
      if (next) {
        event.preventDefault();
        setSelected(next);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [days, activeKey]);

  const activeElapsed = activeKey === todayKey ? elapsed : MINUTES_PER_DAY;
  const totals = useMemo(
    () => dayTotals(activeKey, blocks, dayStart, activeElapsed),
    [activeKey, blocks, dayStart, activeElapsed],
  );

  if (!ready) return <div className="h-[60vh]" aria-hidden="true" />;

  const recorded = days.filter((day) => (blocksByDay[day]?.length ?? 0) > 0);

  return (
    <div>
      <header className="mb-7">
        <p className="text-[13px] text-muted">
          {recorded.length} {recorded.length === 1 ? "day" : "days"} recorded
        </p>
        <h1 className="ask mt-1.5 text-[clamp(28px,4vw,38px)] text-ink">What have your days looked like?</h1>
      </header>

      {recorded.length === 0 ? (
        <EmptyState
          title="No days recorded yet"
          body="Once you record time on the Today page, every day you track shows up here with its totals, and you can open any of them to edit."
        />
      ) : (
        <div className="grid gap-5">
          {/* Days run across the top so the whole width stays free for the day itself. */}
          <Card className="w-fit max-w-full overflow-hidden">
            <ul
              ref={stripRef}
              className={`flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] ${
                scrollable
                  ? "[mask-image:linear-gradient(to_right,transparent_0,#000_28px,#000_calc(100%-28px),transparent_100%)]"
                  : ""
              }`}
            >
              {days.map((day, index) => {
                const dayBlocks = blocksByDay[day] ?? [];
                const summary = dayTotals(
                  day,
                  dayBlocks,
                  dayStart,
                  day === todayKey ? elapsed : MINUTES_PER_DAY,
                );
                const active = day === activeKey;
                const previous = days[index - 1];
                // Tick weight again: a heavier rule where the month turns over.
                const monthTurns = previous !== undefined && previous.slice(0, 7) !== day.slice(0, 7);
                return (
                  <li
                    key={day}
                    className={`w-[176px] shrink-0 ${
                      index === 0 ? "" : monthTurns ? "border-l border-line" : "border-l border-hairline"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(day)}
                      data-active={active ? "true" : undefined}
                      aria-current={active ? "true" : undefined}
                      className={`relative w-full px-4 pb-3.5 pt-4 text-left transition-colors ${
                        active ? "bg-[#f2f4f4]" : "hover:bg-[#f8f9f9]"
                      }`}
                    >
                      {active ? <span className="absolute inset-x-0 top-0 h-[2px] bg-ink" /> : null}
                      <div className="text-[11.5px] text-faint">
                        {day === todayKey ? "Today" : formatWeekday(day)}
                      </div>
                      <div className="mt-0.5 text-[13.5px] font-medium text-ink">{formatDayShort(day)}</div>
                      <div className="mt-2 text-[12px] tabular-nums text-ink-soft">
                        {formatDuration(summary.tracked)} tracked
                      </div>
                      <div className="text-[12px] tabular-nums text-faint">
                        {formatDuration(summary.productive)} focused
                      </div>
                      <MiniStrip blocks={dayBlocks} dayStart={dayStart} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
              {formatDayLong(activeKey)}
            </h2>
            <p className="text-[12.5px] text-muted">Edit any block the same way you record it.</p>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Timeline
              date={activeKey}
              blocks={blocks}
              interval={settings.interval}
              dayStart={dayStart}
              categories={settings.enabledCategories}
              nowOffset={activeKey === todayKey ? elapsed : null}
              onCreate={(input) => onMutate(() => addBlock(input))}
              onUpdate={(id, patch) => onMutate(() => editBlock(id, patch))}
              onDelete={(id) => onMutate(() => removeBlock(id))}
            />
            <div className="grid gap-5 lg:sticky lg:top-[72px]">
              <DailySummary totals={totals} blocks={blocks} dayStart={dayStart} />
              <TimeDistribution totals={totals.byCategory} title="Breakdown" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A two-pixel echo of the day, so the row reads as a run of measurements. */
function MiniStrip({ blocks, dayStart }: { blocks: TimeBlock[]; dayStart: number }) {
  return (
    <div className="relative mt-2.5 h-[3px] overflow-hidden rounded-full bg-[#eceeee]">
      {blocks.map((block) => {
        const range = blockRange(block, dayStart);
        if (range.duration <= 0) return null;
        return (
          <span
            key={block.id}
            className="absolute inset-y-0"
            style={{
              left: `${(range.start / MINUTES_PER_DAY) * 100}%`,
              width: `${(range.duration / MINUTES_PER_DAY) * 100}%`,
              background: category(block.category).color,
            }}
          />
        );
      })}
    </div>
  );
}
