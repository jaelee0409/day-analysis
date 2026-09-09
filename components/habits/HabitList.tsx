"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, PanelTitle } from "@/components/ui/primitives";
import { byTimeOfDay, doseCount, isEveryDay, scheduledOn } from "@/lib/habits";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { checkKey, storage } from "@/lib/storage";
import { useLiveTable, useRefreshOnReturn } from "@/lib/sync";
import { formatWeekdayIndex, weekdayOf } from "@/lib/time";
import type { Habit, TimeOfDay } from "@/types/time";

/**
 * The repeating half of the day: supplements, a skincare step — things you
 * either did or didn't, with no duration to record. They never reach the
 * timeline, because giving them one would mean inventing minutes nobody spent.
 *
 * Only the habits scheduled for the day being viewed are listed, split into
 * the moments they belong to. Two things that alternate are readable that way:
 * on a retinol night the card asks about retinol and does not mention the
 * other one at all. Something taken twice appears under both moments, with a
 * tick of its own in each — that is what a second dose is.
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
  const groups = byTimeOfDay(todays);
  const total = doseCount(todays);
  const done = todays.reduce(
    (count, habit) => count + habit.times.filter((time) => checked.has(checkKey(habit.id, time))).length,
    0,
  );

  const toggle = async (habit: Habit, time: TimeOfDay) => {
    const key = checkKey(habit.id, time);
    const next = !checked.has(key);
    setChecked((current) => {
      const copy = new Set(current);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });
    try {
      await storage.setHabitCheck(habit.id, date, time, next);
    } catch (error) {
      // Put the box back where it was rather than leaving a tick that was
      // never written.
      setChecked((current) => {
        const copy = new Set(current);
        if (next) copy.delete(key);
        else copy.add(key);
        return copy;
      });
      throw error;
    }
  };

  return (
    <Card className="p-5">
      <PanelTitle
        aside={
          total > 0
            ? done === total
              ? t("habits.allDone")
              : t("habits.done", { done, total })
            : undefined
        }
      >
        {t("habits.title")}
      </PanelTitle>

      {habits.length === 0 ? (
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{t("habits.empty")}</p>
      ) : groups.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-muted">{t("habits.noneToday")}</p>
      ) : (
        <div className="mt-3 grid gap-4">
          {groups.map((group) => (
            <div key={group.time}>
              {/* The moment names the group, so the rows under it need no
                  repeated label of their own. Sentence case, like every other
                  heading in the app — see design.md. */}
              <h3 className="text-[12px] font-semibold text-muted">
                {t(`habits.${group.time}` as MessageKey)}
              </h3>

              <ul className="mt-0.5 divide-y divide-hairline">
                {group.habits.map((habit) => {
                  const ticked = checked.has(checkKey(habit.id, group.time));
                  return (
                    <li key={habit.id} className="flex items-center gap-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => void toggle(habit, group.time)}
                        aria-pressed={ticked}
                        aria-label={t(ticked ? "habits.markNotDone" : "habits.markDone", {
                          name: habit.name,
                          time: t(`habits.${group.time}` as MessageKey),
                        })}
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
                      {/* Why this one is here tonight. Every-day habits say
                          nothing, since "every day" beside all of them is
                          just noise. */}
                      {!isEveryDay(habit.days) ? (
                        <span className="shrink-0 text-[11.5px] text-faint">
                          {habit.days.map((day) => formatWeekdayIndex(day, locale)).join(" · ")}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
