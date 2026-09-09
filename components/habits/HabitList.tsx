"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, PanelTitle } from "@/components/ui/primitives";
import { isEveryDay, scheduledOn } from "@/lib/habits";
import { useLocale } from "@/lib/locale-context";
import { storage } from "@/lib/storage";
import { useLiveTable, useRefreshOnReturn } from "@/lib/sync";
import { formatWeekdayIndex, weekdayOf } from "@/lib/time";
import type { Habit } from "@/types/time";

/**
 * The repeating half of the day: supplements, a skincare step — things you
 * either did or didn't, with no duration to record. They never reach the
 * timeline, because giving them one would mean inventing minutes nobody spent.
 *
 * Only the habits scheduled for the day being viewed are listed. That is what
 * makes two alternating products readable: on a retinol night the card asks
 * about retinol and does not mention the other one at all.
 */
export function HabitList({ date }: { date: string }) {
  const { locale, t } = useLocale();
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    const list = await storage.getHabits();
    const ticks = await storage.getHabitChecks(date);
    setHabits(list);
    setChecked(new Set(ticks));
  }, [date]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRefreshOnReturn(reload);
  useLiveTable("habits", reload);
  useLiveTable("habit_checks", reload);

  // Nothing is drawn on a guess: an unticked box that turns out to be ticked
  // is worse than a moment of blank card.
  if (!habits) return null;

  const todays = scheduledOn(habits, weekdayOf(date));
  const done = todays.filter((habit) => checked.has(habit.id)).length;

  const toggle = async (habit: Habit) => {
    const next = !checked.has(habit.id);
    setChecked((current) => {
      const copy = new Set(current);
      if (next) copy.add(habit.id);
      else copy.delete(habit.id);
      return copy;
    });
    try {
      await storage.setHabitCheck(habit.id, date, next);
    } catch (error) {
      // Put the box back where it was rather than leaving a tick that was
      // never written.
      setChecked((current) => {
        const copy = new Set(current);
        if (next) copy.delete(habit.id);
        else copy.add(habit.id);
        return copy;
      });
      throw error;
    }
  };

  return (
    <Card className="p-5">
      <PanelTitle
        aside={
          todays.length > 0
            ? done === todays.length
              ? t("habits.allDone")
              : t("habits.done", { done, total: todays.length })
            : undefined
        }
      >
        {t("habits.title")}
      </PanelTitle>

      {habits.length === 0 ? (
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{t("habits.empty")}</p>
      ) : todays.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-muted">{t("habits.noneToday")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-hairline">
          {todays.map((habit) => {
            const ticked = checked.has(habit.id);
            return (
              <li key={habit.id} className="flex items-center gap-2.5 py-2">
                <button
                  type="button"
                  onClick={() => void toggle(habit)}
                  aria-pressed={ticked}
                  aria-label={t(ticked ? "habits.markNotDone" : "habits.markDone", { name: habit.name })}
                  className={`h-[13px] w-[13px] shrink-0 rounded-full border transition-colors ${
                    ticked ? "border-ink bg-ink" : "border-[#c3c8c8] hover:border-ink"
                  }`}
                />
                <span
                  className={`min-w-0 flex-1 break-words text-[13.5px] ${
                    ticked ? "text-faint line-through" : "text-ink-soft"
                  }`}
                >
                  {habit.name}
                </span>
                {/* Why this one is here tonight. Every-day habits say nothing,
                    since "every day" beside all of them is just noise. */}
                {!isEveryDay(habit.days) ? (
                  <span className="shrink-0 text-[11.5px] text-faint">
                    {habit.days.map((day) => formatWeekdayIndex(day, locale)).join(" · ")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
