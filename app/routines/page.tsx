"use client";

import { useEffect, useMemo, useState } from "react";
import { TimeDistribution } from "@/components/dashboard/TimeDistribution";
import { Timeline } from "@/components/timeline/Timeline";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Card, PanelTitle, Segmented } from "@/components/ui/primitives";
import { dayTotals, rangeTotals } from "@/lib/analytics";
import { useToday } from "@/lib/hooks";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { ROUTINES, routineBlocks } from "@/lib/routines";
import { useSettings } from "@/lib/settings-context";
import { storage } from "@/lib/storage";
import { MINUTES_PER_DAY, formatDuration } from "@/lib/time";
import type { ActivityCategory } from "@/types/time";

/**
 * Someone else's day on the same ruler as your own.
 *
 * The comparison is the point, so both sides are measured the same way: their
 * reported day against your average recorded day, category by category. No
 * score, no target, no suggestion that one is better — just the two numbers
 * next to each other.
 */
export default function RoutinesPage() {
  const { dayStart, ready } = useSettings();
  const { key: todayKey } = useToday();
  const { locale, t } = useLocale();

  const [selected, setSelected] = useState(ROUTINES[0].id);
  const [mine, setMine] = useState<{ minutes: Record<string, number>; days: number } | null>(null);

  const routine = ROUTINES.find((r) => r.id === selected) ?? ROUTINES[0];

  // Their day is drawn against a midnight window, which is how the routines
  // are written, regardless of where the reader starts their own day.
  const blocks = useMemo(() => routineBlocks(routine, todayKey, locale), [routine, todayKey, locale]);
  const theirs = useMemo(() => dayTotals(todayKey, blocks, 0, MINUTES_PER_DAY), [todayKey, blocks]);

  useEffect(() => {
    let cancelled = false;
    storage.getTrackedDays().then(async (days) => {
      if (cancelled || days.length === 0) {
        if (!cancelled) setMine({ minutes: {}, days: 0 });
        return;
      }
      const recent = days.slice(0, 30);
      const byDay = await storage.getBlocksForDays(recent, dayStart);
      if (cancelled) return;
      const totals = rangeTotals(recent, byDay, dayStart);
      const minutes: Record<string, number> = {};
      for (const entry of totals.byCategory) minutes[entry.id] = entry.minutes;
      setMine({ minutes, days: Math.max(1, totals.activeDays) });
    });
    return () => {
      cancelled = true;
    };
  }, [dayStart]);

  if (!ready) return <div className="h-[60vh]" aria-hidden="true" />;

  const rows: { id: ActivityCategory; color: string; theirs: number; yours: number }[] =
    theirs.byCategory.map((entry) => ({
      id: entry.id,
      color: entry.color,
      theirs: entry.minutes,
      yours: mine && mine.days > 0 ? Math.round((mine.minutes[entry.id] ?? 0) / mine.days) : 0,
    }));

  const widest = Math.max(1, ...rows.map((r) => Math.max(r.theirs, r.yours)));

  return (
    <div>
      <header className="mb-7">
        <p className="text-[13px] text-muted">{t("routines.context")}</p>
        <h1 className="ask mt-1.5 text-[clamp(28px,4vw,38px)] text-ink">{t("routines.question")}</h1>
      </header>

      <div className="mb-5">
        <Segmented
          options={ROUTINES.map((r) => ({ value: r.id, label: r.name }))}
          value={selected}
          onChange={setSelected}
          label={t("routines.pick")}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">{routine.name}</h2>
        <span className="text-[13px] text-muted">{routine.role[locale]}</span>
        <span className="text-[13px] text-faint">{routine.note[locale]}</span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Timeline
          date={todayKey}
          blocks={blocks}
          interval={15}
          dayStart={0}
          categories={[]}
          nowOffset={null}
          readOnly
          onCreate={() => undefined}
          onUpdate={() => undefined}
          onDelete={() => undefined}
        />

        <div className="grid gap-5">
          <TimeDistribution totals={theirs.byCategory} title={t("routines.breakdown")} />

          <Card className="p-5">
            <PanelTitle aside={mine && mine.days > 0 ? t("routines.theirs") : undefined}>
              {t("routines.compare")}
            </PanelTitle>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {mine && mine.days > 0
                ? t("routines.yourAverage", { days: mine.days })
                : t("routines.needDays")}
            </p>

            <div className="mt-4 divide-y divide-hairline">
              {rows.map((row) => (
                <div key={row.id} className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0" style={{ color: row.color }}>
                      <CategoryIcon id={row.id} />
                    </span>
                    <span className="flex-1 truncate text-[13.5px] text-ink-soft">
                      {t(`category.${row.id}.label` as MessageKey)}
                    </span>
                  </div>

                  {/* Their day on top, yours beneath, on one shared scale. */}
                  <div className="mt-1.5 grid grid-cols-[38px_minmax(0,1fr)_66px] items-center gap-2">
                    <span className="text-[11px] text-faint">{t("routines.theirs")}</span>
                    <div className="h-[6px] overflow-hidden rounded-full bg-[#eff1f1]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(row.theirs / widest) * 100}%`, background: row.color }}
                      />
                    </div>
                    <span className="text-right text-[12px] tabular-nums text-ink-soft">
                      {formatDuration(row.theirs, locale)}
                    </span>

                    <span className="text-[11px] text-faint">{t("routines.yours")}</span>
                    <div className="h-[6px] overflow-hidden rounded-full bg-[#eff1f1]">
                      <div
                        className="h-full rounded-full bg-ink"
                        style={{ width: `${(row.yours / widest) * 100}%` }}
                      />
                    </div>
                    <span className="text-right text-[12px] tabular-nums text-ink-soft">
                      {row.yours > 0 ? formatDuration(row.yours, locale) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <p className="text-[12px] leading-relaxed text-faint">{t("routines.caveat")}</p>
        </div>
      </div>
    </div>
  );
}
