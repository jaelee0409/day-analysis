"use client";

import type { Figure, Observation } from "@/lib/analytics";
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
 * Plain arithmetic over recorded blocks, one sentence each. Shared by the
 * Dashboard's question card and Home, where the category list would otherwise
 * be printed twice on one screen.
 */
export function ObservationList({ observations }: { observations: Observation[] }) {
  const { locale, t } = useLocale();
  if (observations.length === 0) return null;

  return (
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
  );
}
