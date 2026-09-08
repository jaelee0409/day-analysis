"use client";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Card } from "@/components/ui/primitives";
import type { CategoryTotal, Figure, Observation } from "@/lib/analytics";
import type { Locale, MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { formatDuration } from "@/lib/time";

/** The figure leads every observation, so it is formatted in the reader's language. */
function readFigure(figure: Figure, locale: Locale): string {
  switch (figure.kind) {
    case "percent":
      return `${figure.value}%`;
    case "duration":
      return formatDuration(figure.minutes, locale);
    case "ratio":
      return `${figure.value.toFixed(1)}\u00d7`;
    case "count":
      return String(figure.value);
  }
}

/**
 * The app asking its one question back to you, then answering it with the
 * numbers you recorded. The serif is reserved for the question; everything
 * below it is measurement.
 */
export function InsightCard({
  question,
  spend,
  observations,
}: {
  question: string;
  spend: CategoryTotal[];
  observations: Observation[];
}) {
  const { locale, t } = useLocale();

  // The card sits in a 352px rail on Today and across the full width on the
  // Dashboard, so it measures its own box rather than the viewport.
  return (
    <Card className="@container overflow-hidden">
      <div className="px-6 pt-6">
        <h2 className="ask text-[26px] text-ink">{question}</h2>
      </div>

      <div className="@min-[720px]:grid @min-[720px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @min-[720px]:items-start">
        {/* Every category that holds time. A cap here silently drops the
            smallest ones, which makes the answer to the question wrong. */}
        <ul className="mt-5 px-6 @min-[720px]:mb-6">
          {spend.map((entry) => (
            <li
              key={entry.id}
              className="flex items-baseline gap-3 border-t border-hairline py-2.5 first:border-t-0"
            >
              <span className="shrink-0" style={{ color: entry.color }}>
                <CategoryIcon id={entry.id} />
              </span>
              <span className="figure w-[92px] shrink-0 text-[19px] font-medium text-ink">
                {formatDuration(entry.minutes, locale)}
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

        {observations.length > 0 ? (
          <div className="mt-5 border-t border-line bg-[#fafbfb] px-6 py-5 @min-[720px]:mt-5 @min-[720px]:border-l @min-[720px]:border-t-0 @min-[720px]:self-stretch">
            <ul className="space-y-3">
              {observations.map((observation) => (
                <li key={observation.id} className="flex items-baseline gap-2.5 text-[13.5px] text-ink-soft">
                  <span className="figure shrink-0 text-[17px] font-semibold text-ink">
                    {readFigure(observation.figure, locale)}
                  </span>
                  <span>
                    {t(
                      observation.key,
                      observation.vars?.category
                        ? { category: t(`category.${observation.vars.category}.label` as MessageKey) }
                        : undefined,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
