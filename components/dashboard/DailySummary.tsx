"use client";

import { Card, Stat } from "@/components/ui/primitives";
import { category } from "@/lib/categories";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import type { DayTotals } from "@/lib/analytics";
import { MINUTES_PER_DAY, blockRange, formatDuration, offsetToClock } from "@/lib/time";
import type { TimeBlock } from "@/types/time";

/**
 * The whole day compressed into one measured strip. Recorded time is drawn
 * at its true position and width, so the gaps are the day you cannot
 * account for — which is the question the app is asking.
 */
function DayStrip({
  blocks,
  dayStart,
  elapsed,
}: {
  blocks: TimeBlock[];
  dayStart: number;
  elapsed: number;
}) {
  return (
    <div className="relative h-9 w-full overflow-hidden rounded-md bg-white/12">
      {elapsed < MINUTES_PER_DAY ? (
        <div
          className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.05)_0_6px,transparent_6px_12px)]"
          style={{ left: `${(elapsed / MINUTES_PER_DAY) * 100}%`, right: 0 }}
        />
      ) : null}

      {blocks.map((block) => {
        const range = blockRange(block, dayStart);
        if (range.duration <= 0) return null;
        return (
          <div
            key={block.id}
            className="absolute inset-y-0"
            title={`${offsetToClock(range.start, dayStart)}–${offsetToClock(range.end, dayStart)}`}
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

export function DailySummary({
  totals,
  blocks,
  dayStart,
}: {
  totals: DayTotals;
  blocks: TimeBlock[];
  dayStart: number;
}) {
  const { locale, t } = useLocale();
  const coverage = totals.elapsed > 0 ? Math.round((totals.tracked / totals.elapsed) * 100) : 0;

  // This is the page's headline reading, so it is the one filled panel.
  return (
    <Card tone="lead" className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="whitespace-nowrap">
          <Stat value={formatDuration(totals.tracked, locale)} label={t("today.tracked")} size="lg" tone="inverse" />
        </div>
        <span className="whitespace-nowrap pb-1 text-[12.5px] tabular-nums text-white/45">
          {t("today.coverage", { percent: coverage })}
        </span>
      </div>

      <div className="mt-5">
        <DayStrip blocks={blocks} dayStart={dayStart} elapsed={totals.elapsed} />
        <div className="mt-2 flex justify-between text-[11px] tabular-nums text-white/40">
          <span>{offsetToClock(0, dayStart)}</span>
          <span>{offsetToClock(720, dayStart)}</span>
          <span>{offsetToClock(1439, dayStart)}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/12 pt-5">
        <Stat
          value={formatDuration(totals.productive, locale)}
          label={t("today.focused")}
          size="sm"
          tone="inverse"
        />
        <Stat value={formatDuration(totals.sleep, locale)} label={t("today.sleep")} size="sm" tone="inverse" />
        <Stat
          value={formatDuration(totals.untracked, locale)}
          label={t("today.unaccounted")}
          size="sm"
          tone="inverse-muted"
        />
      </div>
    </Card>
  );
}
