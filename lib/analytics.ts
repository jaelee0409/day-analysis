/**
 * Pure analysis over recorded blocks. No storage, no React — everything here
 * takes blocks in and returns numbers out, so the same functions can run on a
 * server once the data moves off the browser.
 */

import { CATEGORIES, category, isProductive } from "@/lib/categories";
import { MINUTES_PER_DAY, blockRange, formatDuration } from "@/lib/time";
import type { ActivityCategory, ExperimentSession, Interval, TimeBlock } from "@/types/time";

export type CategoryTotal = {
  id: ActivityCategory;
  label: string;
  color: string;
  phrase: string;
  minutes: number;
  /** Fraction of tracked time, 0–1. */
  share: number;
};

export type DayTotals = {
  date: string;
  /** Minutes of the day window that have already passed. */
  elapsed: number;
  tracked: number;
  untracked: number;
  productive: number;
  leisure: number;
  exercise: number;
  sleep: number;
  /** Elapsed minutes minus recorded sleep. */
  waking: number;
  byCategory: CategoryTotal[];
  blockCount: number;
};

const EMPTY_CATEGORY_MAP = () =>
  Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<ActivityCategory, number>;

/**
 * @param elapsed How much of the day window has passed. Pass 1440 for a
 *   finished day; pass the current offset for today, so untracked time means
 *   "lived but not recorded" rather than "not yet happened".
 */
export function dayTotals(
  date: string,
  blocks: TimeBlock[],
  dayStart: number,
  elapsed: number = MINUTES_PER_DAY,
): DayTotals {
  const minutesBy = EMPTY_CATEGORY_MAP();
  let tracked = 0;

  for (const block of blocks) {
    const { duration } = blockRange(block, dayStart);
    if (duration <= 0) continue;
    minutesBy[block.category] += duration;
    tracked += duration;
  }

  const byCategory: CategoryTotal[] = CATEGORIES.filter((c) => minutesBy[c.id] > 0)
    .map((c) => ({
      id: c.id,
      label: c.label,
      color: c.color,
      phrase: c.phrase,
      minutes: minutesBy[c.id],
      share: tracked > 0 ? minutesBy[c.id] / tracked : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const productive = CATEGORIES.filter((c) => c.productive).reduce((sum, c) => sum + minutesBy[c.id], 0);
  const recordedTo = blocks.reduce((latest, b) => Math.max(latest, blockRange(b, dayStart).end), 0);
  const clampedElapsed = Math.max(0, Math.min(MINUTES_PER_DAY, Math.max(elapsed, recordedTo)));

  return {
    date,
    elapsed: clampedElapsed,
    tracked,
    untracked: Math.max(0, clampedElapsed - tracked),
    productive,
    leisure: minutesBy.leisure,
    exercise: minutesBy.exercise,
    sleep: minutesBy.sleep,
    waking: Math.max(0, clampedElapsed - minutesBy.sleep),
    byCategory,
    blockCount: blocks.length,
  };
}

/* ------------------------------------------------------------------ *
 * Focus sessions
 * ------------------------------------------------------------------ */

export type FocusSession = {
  minutes: number;
  start: number;
  end: number;
  categories: ActivityCategory[];
};

/**
 * The longest unbroken stretch of productive work. Consecutive productive
 * blocks that touch each other count as one session; any gap, or anything
 * non-productive in between, ends it.
 */
export function focusSessions(blocks: TimeBlock[], dayStart: number): FocusSession[] {
  const ranges = blocks
    .map((b) => ({ ...blockRange(b, dayStart), category: b.category }))
    .filter((r) => r.duration > 0)
    .sort((a, b) => a.start - b.start);

  const sessions: FocusSession[] = [];
  let current: FocusSession | null = null;

  for (const range of ranges) {
    if (!isProductive(range.category)) {
      current = null;
      continue;
    }
    if (current && range.start <= current.end) {
      current.end = Math.max(current.end, range.end);
      current.minutes = current.end - current.start;
      if (!current.categories.includes(range.category)) current.categories.push(range.category);
    } else {
      current = {
        start: range.start,
        end: range.end,
        minutes: range.duration,
        categories: [range.category],
      };
      sessions.push(current);
    }
  }

  return sessions.sort((a, b) => b.minutes - a.minutes);
}

export function longestFocusSession(blocks: TimeBlock[], dayStart: number): FocusSession | null {
  return focusSessions(blocks, dayStart)[0] ?? null;
}

/** How many times the day changed activity. */
export function switchCount(blocks: TimeBlock[], dayStart: number): number {
  const ordered = [...blocks].sort((a, b) => blockRange(a, dayStart).start - blockRange(b, dayStart).start);
  let switches = 0;
  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i].category !== ordered[i - 1].category) switches += 1;
  }
  return switches;
}

/* ------------------------------------------------------------------ *
 * Multi-day analysis
 * ------------------------------------------------------------------ */

export type RangeTotals = {
  days: DayTotals[];
  tracked: number;
  productive: number;
  byCategory: CategoryTotal[];
  /** Days in the range that have at least one block. */
  activeDays: number;
};

export function rangeTotals(
  keys: string[],
  blocksByDay: Record<string, TimeBlock[]>,
  dayStart: number,
  elapsedByDay: Record<string, number> = {},
): RangeTotals {
  const days = keys.map((key) =>
    dayTotals(key, blocksByDay[key] ?? [], dayStart, elapsedByDay[key] ?? MINUTES_PER_DAY),
  );

  const minutesBy = EMPTY_CATEGORY_MAP();
  let tracked = 0;
  let productive = 0;

  for (const day of days) {
    tracked += day.tracked;
    productive += day.productive;
    for (const c of day.byCategory) minutesBy[c.id] += c.minutes;
  }

  const byCategory: CategoryTotal[] = CATEGORIES.filter((c) => minutesBy[c.id] > 0)
    .map((c) => ({
      id: c.id,
      label: c.label,
      color: c.color,
      phrase: c.phrase,
      minutes: minutesBy[c.id],
      share: tracked > 0 ? minutesBy[c.id] / tracked : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    days,
    tracked,
    productive,
    byCategory,
    activeDays: days.filter((d) => d.blockCount > 0).length,
  };
}

/* ------------------------------------------------------------------ *
 * Observations
 *
 * Plain arithmetic on recorded data. Nothing is inferred, guessed, or
 * generated by a model — if a number is not in the blocks, it is not said.
 * ------------------------------------------------------------------ */

export type Observation = {
  id: string;
  text: string;
  /** The number the sentence turns on, pulled out for emphasis. */
  figure: string;
};

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function dayObservations(
  totals: DayTotals,
  blocks: TimeBlock[],
  dayStart: number,
  comparison?: { averageProductive: number; label: string },
): Observation[] {
  const out: Observation[] = [];
  if (totals.tracked === 0) return out;

  const topAwake = totals.byCategory.find((entry) => entry.id !== "sleep");
  if (topAwake && totals.waking > 0) {
    out.push({
      id: "top-category",
      figure: `${percent(topAwake.minutes, totals.waking)}%`,
      text: `of your waking time went to ${topAwake.label.toLowerCase()}.`,
    });
  }

  const longest = longestFocusSession(blocks, dayStart);
  if (longest) {
    out.push({
      id: "focus",
      figure: formatDuration(longest.minutes),
      text: "was your longest uninterrupted focus session.",
    });
  }

  if (totals.elapsed > 0) {
    out.push({
      id: "coverage",
      figure: `${percent(totals.tracked, totals.elapsed)}%`,
      text: "of the day so far is accounted for.",
    });
  }

  if (totals.leisure > 0 && totals.productive > 0) {
    const ratio = totals.productive / totals.leisure;
    out.push({
      id: "ratio",
      figure: `${ratio.toFixed(1)}×`,
      text: `more time on focused work than on leisure.`,
    });
  }

  const switches = switchCount(blocks, dayStart);
  if (switches >= 2) {
    out.push({
      id: "switches",
      figure: String(switches),
      text: "times you changed what you were doing.",
    });
  }

  if (comparison && comparison.averageProductive > 0) {
    const delta = totals.productive - comparison.averageProductive;
    const direction = delta >= 0 ? "above" : "below";
    out.push({
      id: "vs-average",
      figure: formatDuration(Math.abs(delta)),
      text: `${direction} your ${comparison.label} average for focused work.`,
    });
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Time-block experiment
 * ------------------------------------------------------------------ */

export type BlockSizeStats = {
  blockSize: Interval;
  sessions: number;
  focused: number;
  /** Share of sessions finished without interruption, 0–100. */
  focusRate: number;
  /** Total minutes held across all sessions of this size. */
  minutes: number;
  /** Average minutes actually held before the session ended. */
  averageHeld: number;
};

export const BLOCK_SIZES: Interval[] = [15, 30, 60];

export function experimentStats(sessions: ExperimentSession[]): BlockSizeStats[] {
  return BLOCK_SIZES.map((blockSize) => {
    const forSize = sessions.filter((s) => s.blockSize === blockSize);
    const focused = forSize.filter((s) => s.outcome === "focused").length;
    const minutes = forSize.reduce((sum, s) => sum + s.elapsedMinutes, 0);
    return {
      blockSize,
      sessions: forSize.length,
      focused,
      focusRate: forSize.length > 0 ? Math.round((focused / forSize.length) * 100) : 0,
      minutes,
      averageHeld: forSize.length > 0 ? Math.round(minutes / forSize.length) : 0,
    };
  });
}

/** The size with the best focus rate, once there is enough data to mean anything. */
export function bestBlockSize(stats: BlockSizeStats[], minimumSessions = 3): BlockSizeStats | null {
  const eligible = stats.filter((s) => s.sessions >= minimumSessions);
  if (eligible.length < 2) return null;
  return eligible.reduce((best, s) => (s.focusRate > best.focusRate ? s : best));
}

/* ------------------------------------------------------------------ *
 * Range observations
 * ------------------------------------------------------------------ */

export function rangeObservations(
  totals: RangeTotals,
  blocksByDay: Record<string, TimeBlock[]>,
  dayStart: number,
  spanMinutes: number,
): Observation[] {
  const out: Observation[] = [];
  if (totals.tracked === 0) return out;

  const top = totals.byCategory[0];
  if (top) {
    out.push({
      id: "range-top",
      figure: `${percent(top.minutes, totals.tracked)}%`,
      text: `of everything you recorded went to ${top.label.toLowerCase()}.`,
    });
  }

  out.push({
    id: "range-coverage",
    figure: `${percent(totals.tracked, spanMinutes)}%`,
    text: "of the period is accounted for.",
  });

  if (totals.activeDays > 0) {
    out.push({
      id: "range-average",
      figure: formatDuration(Math.round(totals.productive / totals.activeDays)),
      text: `of focused work on an average recorded day.`,
    });
  }

  let best: { minutes: number; date: string } | null = null;
  for (const [date, blocks] of Object.entries(blocksByDay)) {
    const session = longestFocusSession(blocks, dayStart);
    if (session && (!best || session.minutes > best.minutes)) {
      best = { minutes: session.minutes, date };
    }
  }
  if (best) {
    out.push({
      id: "range-longest",
      figure: formatDuration(best.minutes),
      text: "was the longest unbroken stretch of focus in the period.",
    });
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Rhythm
 *
 * Regularity rather than amount: what time things actually happened, day
 * after day. Every definition below is one sentence long on purpose — a
 * number you cannot explain is a number you cannot act on, and the panel
 * prints the rule next to the figure.
 *
 * The definitions also survive the way sleep is recorded. A night that runs
 * 23:00 to 07:00 is two blocks, one at the end of one day window and one at
 * the start of the next, so "wake" looks only before midday and "bed" only
 * after it. That also keeps every value inside a single half of the clock,
 * so the median never has to wrap.
 * ------------------------------------------------------------------ */

const MIDDAY = 720;

export type RhythmPoint = { date: string; value: number };

export type RhythmMeasure = {
  id: "wake" | "bed" | "firstMeal" | "night";
  label: string;
  /** Clock values are offsets into the day window; durations are lengths. */
  kind: "clock" | "duration";
  points: RhythmPoint[];
  median: number;
  /**
   * Mean distance from the median, in minutes.
   *
   * Median absolute deviation was the first choice and it lies on small
   * samples: with seven of thirteen nights identical it reports zero drift
   * while the rest swing an hour. The mean counts every day, so a habit only
   * reads as steady when it actually is.
   */
  spread: number;
  rule: string;
};

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** The end of the last sleep block that finishes before midday. */
export function wakeOffset(blocks: TimeBlock[], dayStart: number): number | null {
  const ends = blocks
    .filter((b) => b.category === "sleep")
    .map((b) => blockRange(b, dayStart).end)
    .filter((end) => end > 0 && end <= MIDDAY);
  return ends.length > 0 ? Math.max(...ends) : null;
}

/** The start of the first sleep block that begins after midday. */
export function bedOffset(blocks: TimeBlock[], dayStart: number): number | null {
  const starts = blocks
    .filter((b) => b.category === "sleep")
    .map((b) => blockRange(b, dayStart).start)
    .filter((start) => start >= MIDDAY);
  return starts.length > 0 ? Math.min(...starts) : null;
}

/** The start of the earliest block recorded as food. */
export function firstMealOffset(blocks: TimeBlock[], dayStart: number): number | null {
  const starts = blocks
    .filter((b) => b.category === "food")
    .map((b) => blockRange(b, dayStart).start);
  return starts.length > 0 ? Math.min(...starts) : null;
}

export function rhythm(
  keys: string[],
  blocksByDay: Record<string, TimeBlock[]>,
  dayStart: number,
): RhythmMeasure[] {
  const wake: RhythmPoint[] = [];
  const bed: RhythmPoint[] = [];
  const meal: RhythmPoint[] = [];
  const night: RhythmPoint[] = [];

  keys.forEach((key, index) => {
    const blocks = blocksByDay[key] ?? [];
    const wokeAt = wakeOffset(blocks, dayStart);
    const wentToBedAt = bedOffset(blocks, dayStart);
    const ateAt = firstMealOffset(blocks, dayStart);

    if (wokeAt !== null) wake.push({ date: key, value: wokeAt });
    if (wentToBedAt !== null) bed.push({ date: key, value: wentToBedAt });
    if (ateAt !== null) meal.push({ date: key, value: ateAt });

    // A night belongs to the morning it ends on, so it needs both days.
    const previous = keys[index - 1];
    const previousBed = previous ? bedOffset(blocksByDay[previous] ?? [], dayStart) : null;
    if (previousBed !== null && wokeAt !== null) {
      night.push({ date: key, value: MINUTES_PER_DAY - previousBed + wokeAt });
    }
  });

  const build = (
    id: RhythmMeasure["id"],
    label: string,
    kind: RhythmMeasure["kind"],
    points: RhythmPoint[],
    rule: string,
  ): RhythmMeasure => {
    if (points.length === 0) return { id, label, kind, points, median: 0, spread: 0, rule };
    const med = medianOf(points.map((p) => p.value));
    const drift = points.reduce((sum, p) => sum + Math.abs(p.value - med), 0) / points.length;
    return { id, label, kind, points, median: med, spread: Math.round(drift), rule };
  };

  return [
    build("wake", "Wake", "clock", wake, "The end of the last sleep block that finishes before midday."),
    build("bed", "Bed", "clock", bed, "The start of the first sleep block that begins after midday."),
    build("firstMeal", "First meal", "clock", meal, "The start of the earliest block recorded as food."),
    build("night", "Night's sleep", "duration", night, "From the previous evening's bed time to that morning's wake."),
  ];
}
