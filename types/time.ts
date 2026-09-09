/**
 * Core domain model.
 *
 * Time is stored the way a person reads it: a calendar date plus wall-clock
 * "HH:mm" strings. Nothing here knows about localStorage, React, or the
 * network — that keeps the model portable when the storage layer moves to a
 * Next.js API route backed by Postgres.
 */

export type ActivityCategory =
  | "development"
  | "study"
  | "work"
  | "exercise"
  | "food"
  | "sleep"
  | "hygiene"
  | "chores"
  | "leisure"
  | "social"
  | "transit"
  | "other";

/** Grid resolution, in minutes. */
export type Interval = 15 | 30 | 60;

export type TimeBlock = {
  id: string;
  /** Day-window key, "yyyy-MM-dd". See lib/time.ts for how windows are cut. */
  date: string;
  title?: string;
  category: ActivityCategory;
  /** Wall clock, "HH:mm". */
  startTime: string;
  /** Wall clock, "HH:mm". May be numerically earlier than startTime if the block crosses midnight. */
  endTime: string;
  /** Grid resolution the block was recorded against. */
  interval: Interval;
  createdAt: string;
  updatedAt: string;
};

/** A block that has not been persisted yet. */
export type NewTimeBlock = Omit<TimeBlock, "id" | "createdAt" | "updatedAt">;

export type Settings = {
  interval: Interval;
  /** Wall clock, "HH:mm". The hour a personal day begins. */
  dayStartsAt: string;
  /** Categories the user wants offered. Order is preserved for the picker. */
  enabledCategories: ActivityCategory[];
};

/**
 * One run of the time-block experiment. Deliberately thin: the MVP scores a
 * session as focused or interrupted, but the shape leaves room for richer
 * signals (distraction counts, self-rated depth) without a migration.
 */
export type ExperimentSession = {
  id: string;
  date: string;
  blockSize: Interval;
  startedAt: string;
  endedAt: string;
  /** Minutes actually spent before the session ended. */
  elapsedMinutes: number;
  outcome: "focused" | "interrupted";
  note?: string;
};

/**
 * A reminder. Deliberately thin — text, done, and when. No due dates, no
 * priorities, no projects: see design.md for why this stays small.
 */
export type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  completedAt?: string;
};

/** 0 = Sunday .. 6 = Saturday, matching Date#getDay. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * When in the day something is taken. Three named moments rather than a clock
 * time: nobody takes a supplement at 08:15 exactly, and a fixed hour would
 * turn a reminder into an alarm that is always slightly wrong.
 */
export type TimeOfDay = "morning" | "afternoon" | "night";

/**
 * Something you mean to do on certain days: a supplement, a step in a skincare
 * routine. Not a time block — it has no duration and never reaches the
 * timeline. All that is recorded is whether it happened.
 *
 * The schedule is a set of weekdays rather than a recurrence rule. Two things
 * that alternate are two habits holding complementary sets, so exactly one of
 * them is scheduled on any given night.
 */
export type Habit = {
  id: string;
  name: string;
  days: Weekday[];
  /** Moments in the day. More than one means more than one dose. */
  times: TimeOfDay[];
  /** Order in the list, as the person arranged it. */
  position: number;
  createdAt: string;
};

/**
 * One moment on one day that a habit was done. Absence is "not done"; there is
 * no stored false. A twice-a-day habit has two of these per day, ticked
 * independently.
 */
export type HabitCheck = {
  habitId: string;
  /** Day-window key, "yyyy-MM-dd". */
  date: string;
  timeOfDay: TimeOfDay;
  checkedAt: string;
};

export type CategoryMeta = {
  id: ActivityCategory;
  label: string;
  /** Solid mark colour, used for spines, dots and chart segments. */
  color: string;
  /** Counts toward "productive time". */
  productive: boolean;
  /** How the app says it out loud: "4h 20m developing". */
  phrase: string;
};
