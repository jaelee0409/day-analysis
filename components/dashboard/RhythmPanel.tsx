"use client";

import { Card, PanelTitle } from "@/components/ui/primitives";
import type { RhythmMeasure } from "@/lib/analytics";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { formatDuration, offsetToClock } from "@/lib/time";

/**
 * Every row shares one fixed ±3h scale. An axis that stretched to fit each
 * measure would make a tight habit and a scattered one look identical, which
 * is the opposite of the point: here a short cluster *is* a steady habit.
 */
const WINDOW = 180;

/** Two or three points is coincidence, not a rhythm. */
const ENOUGH = 4;

const RULE: Record<RhythmMeasure["id"], MessageKey> = {
  wake: "rhythm.ruleWake",
  bed: "rhythm.ruleBed",
  firstMeal: "rhythm.ruleMeal",
  night: "rhythm.ruleNight",
};

const LABEL: Record<RhythmMeasure["id"], MessageKey> = {
  wake: "rhythm.wake",
  bed: "rhythm.bed",
  firstMeal: "rhythm.firstMeal",
  night: "rhythm.night",
};

function position(value: number, median: number): number {
  const delta = Math.max(-WINDOW, Math.min(WINDOW, value - median));
  return 50 + (delta / WINDOW) * 50;
}

function Scatter({ measure }: { measure: RhythmMeasure }) {
  return (
    <div className="relative h-6" aria-hidden="true">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#eceeee]" />

      {[-120, -60, 60, 120].map((tick) => (
        <span
          key={tick}
          className="absolute top-1/2 h-[7px] w-px -translate-y-1/2 bg-[#e3e6e6]"
          style={{ left: `${50 + (tick / WINDOW) * 50}%` }}
        />
      ))}

      {/* The median, which every dot is measured against. */}
      <span className="absolute top-1/2 h-[15px] w-px -translate-y-1/2 bg-ink" style={{ left: "50%" }} />

      {measure.points.map((point) => (
        <span
          key={point.date}
          className="absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/30"
          style={{ left: `${position(point.value, measure.median)}%` }}
        />
      ))}
    </div>
  );
}

export function RhythmPanel({ measures, dayStart }: { measures: RhythmMeasure[]; dayStart: number }) {
  const { locale, t } = useLocale();
  const anything = measures.some((m) => m.points.length >= ENOUGH);

  return (
    <Card className="p-5">
      <PanelTitle aside={anything ? t("rhythm.aside") : undefined}>{t("rhythm.title")}</PanelTitle>
      <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-muted">{t("rhythm.body")}</p>

      <div className="mt-5 space-y-1">
        <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-x-4 sm:grid-cols-[104px_78px_58px_minmax(0,1fr)]">
          <span />
          <span className="hidden sm:block" />
          <span className="hidden sm:block" />
          <div className="flex justify-between text-[11px] tabular-nums text-faint">
            <span>{t("rhythm.earlier")}</span>
            <span>{t("rhythm.typical")}</span>
            <span>{t("rhythm.later")}</span>
          </div>
        </div>

        {measures.map((measure) => {
          const enough = measure.points.length >= ENOUGH;
          const value =
            measure.kind === "clock"
              ? offsetToClock(measure.median, dayStart)
              : formatDuration(measure.median, locale);

          return (
            <div
              key={measure.id}
              title={t(RULE[measure.id])}
              className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 border-t border-hairline py-2.5 sm:grid-cols-[104px_78px_58px_minmax(0,1fr)]"
            >
              <span className="text-[13.5px] text-ink-soft">{t(LABEL[measure.id])}</span>

              {enough ? (
                <>
                  <span className="figure text-[17px] font-medium tabular-nums text-ink">{value}</span>
                  <span className="text-[12.5px] tabular-nums text-muted">
                    ±{formatDuration(measure.spread, locale)}
                  </span>
                  <Scatter measure={measure} />
                </>
              ) : (
                <span className="text-[12.5px] text-faint sm:col-span-3">
                  {measure.points.length === 0
                    ? t("rhythm.nothingYet")
                    : t("rhythm.needMore", { have: measure.points.length, need: ENOUGH })}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 border-t border-hairline pt-3 text-[12px] leading-relaxed text-faint">
        {t("rhythm.footnote")}
      </p>
    </Card>
  );
}
