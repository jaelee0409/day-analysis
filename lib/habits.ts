/**
 * The habit schedule.
 *
 * Pure and language-neutral, like lib/analytics.ts: nothing here reads
 * settings, storage or the clock. A habit's schedule is a set of weekdays,
 * which is enough to express both "every day" and "two nights a week" without
 * a recurrence language nobody would want to configure.
 *
 * There is deliberately no starter list. What someone takes and when is
 * personal, and a default list would have meant shipping one person's
 * supplements to every account that ever signs in — as well as writing them
 * into a public repository. An account starts empty and the owner fills it.
 */

import type { Habit, Weekday } from "@/types/time";

export const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function isEveryDay(days: Weekday[]): boolean {
  return days.length === 7;
}

/** The habits that apply on one weekday, in list order. */
export function scheduledOn(habits: Habit[], weekday: Weekday): Habit[] {
  return habits.filter((habit) => habit.days.includes(weekday));
}

/**
 * Adding or removing one day, never emptying the set: a habit scheduled on no
 * days would sit in the list saying nothing and never appear anywhere.
 */
export function toggleDay(days: Weekday[], day: Weekday): Weekday[] {
  if (days.includes(day)) {
    if (days.length === 1) return days;
    return days.filter((d) => d !== day);
  }
  return [...days, day].sort((a, b) => a - b);
}
