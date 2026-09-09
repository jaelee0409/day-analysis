/**
 * The habit schedule.
 *
 * Pure and language-neutral, like lib/analytics.ts: nothing here reads
 * settings, storage or the clock. A habit is scheduled on two axes — which
 * days of the week, and which moments within a day — and both are sets, so
 * "every day, morning and night" needs no special case.
 *
 * There is deliberately no starter list. What someone takes and when is
 * personal, and a default list would have meant shipping one person's
 * supplements to every account that ever signs in — as well as writing them
 * into a public repository. An account starts empty and the owner fills it.
 */

import type { Habit, TimeOfDay, Weekday } from "@/types/time";

export const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/** In the order a day runs, which is the order the card lists them. */
export const TIMES_OF_DAY: TimeOfDay[] = ["morning", "afternoon", "night"];

export function isEveryDay(days: Weekday[]): boolean {
  return days.length === 7;
}

/** The habits that apply on one weekday, in list order. */
export function scheduledOn(habits: Habit[], weekday: Weekday): Habit[] {
  return habits.filter((habit) => habit.days.includes(weekday));
}

/**
 * A day's habits split into its moments, keeping list order inside each and
 * dropping the moments nothing falls in. A habit set to more than one moment
 * appears in each of them — that is what a second dose is.
 */
export function byTimeOfDay(habits: Habit[]): { time: TimeOfDay; habits: Habit[] }[] {
  return TIMES_OF_DAY.map((time) => ({
    time,
    habits: habits.filter((habit) => habit.times.includes(time)),
  })).filter((group) => group.habits.length > 0);
}

/** How many ticks a day asks for, counting a twice-a-day habit twice. */
export function doseCount(habits: Habit[]): number {
  return habits.reduce((total, habit) => total + habit.times.length, 0);
}

/**
 * Adding or removing one entry, never emptying the set: a habit scheduled on
 * no days, or at no time, would sit in the list saying nothing and never
 * appear anywhere.
 */
function toggleIn<T>(values: T[], value: T, order: T[]): T[] {
  if (values.includes(value)) {
    if (values.length === 1) return values;
    return values.filter((v) => v !== value);
  }
  return order.filter((v) => v === value || values.includes(v));
}

export function toggleDay(days: Weekday[], day: Weekday): Weekday[] {
  return toggleIn(days, day, EVERY_DAY);
}

export function toggleTime(times: TimeOfDay[], time: TimeOfDay): TimeOfDay[] {
  return toggleIn(times, time, TIMES_OF_DAY);
}
