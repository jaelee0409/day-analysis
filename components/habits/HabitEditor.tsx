"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, PanelTitle } from "@/components/ui/primitives";
import { EVERY_DAY, TIMES_OF_DAY, isEveryDay, toggleDay, toggleTime } from "@/lib/habits";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { storage } from "@/lib/storage";
import { formatWeekdayIndex } from "@/lib/time";
import type { Habit, TimeOfDay, Weekday } from "@/types/time";

/** A chevron, reused pointing either way. */
function Chevron({ up }: { up: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d={up ? "M2.5 7.5 6 4l3.5 3.5" : "M2.5 4.5 6 8l3.5-3.5"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The list behind the home page's habit card.
 *
 * Editing is direct: type over a name, tap the days it applies to, and the
 * change is saved. There is no form to submit, because a settings page with a
 * Save button invites you to leave without pressing it.
 */
export function HabitEditor() {
  const { locale, t } = useLocale();
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [draft, setDraft] = useState("");

  const reload = useCallback(async () => {
    setHabits(await storage.getHabits());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!habits) return null;

  const add = async () => {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    await storage.createHabit(name, [...EVERY_DAY], ["morning"]);
    await reload();
  };

  const rename = async (habit: Habit, name: string) => {
    const next = name.trim();
    if (!next || next === habit.name) return;
    await storage.updateHabit(habit.id, { name: next });
    await reload();
  };

  const setDays = async (habit: Habit, day: Weekday) => {
    const days = toggleDay(habit.days, day);
    if (days === habit.days) return; // the last day cannot be removed
    setHabits((current) =>
      current ? current.map((h) => (h.id === habit.id ? { ...h, days } : h)) : current,
    );
    await storage.updateHabit(habit.id, { days });
  };

  const setTimes = async (habit: Habit, time: TimeOfDay) => {
    const times = toggleTime(habit.times, time);
    if (times === habit.times) return; // the last moment cannot be removed
    setHabits((current) =>
      current ? current.map((h) => (h.id === habit.id ? { ...h, times } : h)) : current,
    );
    await storage.updateHabit(habit.id, { times });
  };

  const move = async (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= habits.length) return;
    const next = [...habits];
    [next[index], next[target]] = [next[target], next[index]];
    setHabits(next);
    await storage.reorderHabits(next.map((h) => h.id));
    await reload();
  };

  return (
    <Card className="p-5">
      <PanelTitle aside={habits.length > 0 ? t("settings.habitsOn", { count: habits.length }) : undefined}>
        {t("settings.habits")}
      </PanelTitle>
      <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
        {t("settings.habitsBody")}
      </p>

      {habits.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-faint">{t("settings.habitsEmpty")}</p>
      ) : null}

      <ul className="mt-4 divide-y divide-hairline">
        {habits.map((habit, index) => (
          <li key={habit.id} className="py-3">
            <div className="flex items-center gap-2">
              {/* Keyed on the name so a rename elsewhere refreshes the box;
                  otherwise defaultValue would hold the stale text forever. */}
              <input
                key={`${habit.id}:${habit.name}`}
                defaultValue={habit.name}
                onBlur={(event) => void rename(habit, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    event.currentTarget.value = habit.name;
                    event.currentTarget.blur();
                  }
                }}
                aria-label={t("settings.habitRename", { name: habit.name })}
                className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-[13.5px] text-ink hover:border-line focus:border-ink focus:bg-surface focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void move(index, -1)}
                disabled={index === 0}
                aria-label={t("settings.habitUp", { name: habit.name })}
                className="shrink-0 rounded p-1.5 text-faint transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-faint"
              >
                <Chevron up />
              </button>
              <button
                type="button"
                onClick={() => void move(index, 1)}
                disabled={index === habits.length - 1}
                aria-label={t("settings.habitDown", { name: habit.name })}
                className="shrink-0 rounded p-1.5 text-faint transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-faint"
              >
                <Chevron up={false} />
              </button>
              <button
                type="button"
                onClick={async () => {
                  await storage.deleteHabit(habit.id);
                  await reload();
                }}
                aria-label={t("settings.habitDelete", { name: habit.name })}
                className="shrink-0 rounded p-1.5 text-faint transition-colors hover:text-ink"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="m2.5 2.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-2">
              <div
                role="group"
                aria-label={t("settings.habitDays", { name: habit.name })}
                className="flex gap-1"
              >
                {EVERY_DAY.map((day) => {
                  const on = habit.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => void setDays(habit, day)}
                      aria-pressed={on}
                      aria-label={t("settings.habitDay", {
                        day: formatWeekdayIndex(day, locale),
                        name: habit.name,
                      })}
                      className={`h-[26px] min-w-[34px] rounded-md border px-1.5 text-[11.5px] font-medium transition-colors ${
                        on
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface text-muted hover:border-[#cfd4d4] hover:text-ink"
                      }`}
                    >
                      {formatWeekdayIndex(day, locale)}
                    </button>
                  );
                })}
              </div>
              {isEveryDay(habit.days) ? (
                <span className="text-[11.5px] text-faint">{t("settings.habitEveryDay")}</span>
              ) : null}
            </div>

            {/* When in the day, on its own line: picking two here means two
                doses, and the home page asks about each separately. */}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-2">
              <div
                role="group"
                aria-label={t("settings.habitTimes", { name: habit.name })}
                className="flex gap-1"
              >
                {TIMES_OF_DAY.map((time) => {
                  const on = habit.times.includes(time);
                  const label = t(`habits.${time}` as MessageKey);
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => void setTimes(habit, time)}
                      aria-pressed={on}
                      aria-label={t("settings.habitTime", { time: label, name: habit.name })}
                      className={`h-[26px] rounded-md border px-2.5 text-[11.5px] font-medium transition-colors ${
                        on
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface text-muted hover:border-[#cfd4d4] hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {habit.times.length > 1 ? (
                <span className="text-[11.5px] text-faint">
                  {t("settings.habitDoses", { count: habit.times.length })}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void add();
            }
          }}
          placeholder={t("settings.habitPlaceholder")}
          aria-label={t("settings.habitNew")}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-[13.5px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
        />
        <Button variant="secondary" size="sm" onClick={() => void add()} disabled={!draft.trim()}>
          {t("settings.habitAdd")}
        </Button>
      </div>
    </Card>
  );
}
