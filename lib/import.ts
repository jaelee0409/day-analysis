/**
 * Reading an export, without writing anything.
 *
 * Kept apart from `storage.ts` because it is pure parsing: it validates a file
 * and describes it so the UI can say what is in it before anything is
 * replaced. Nothing here touches Supabase or the browser store.
 */

import type {
  ExperimentSession,
  Habit,
  HabitCheck,
  Settings,
  TimeBlock,
  TimeOfDay,
  Todo,
} from "@/types/time";

export type ImportSummary = {
  blocks: number;
  days: number;
  experiments: number;
  todos: number;
  /** Null when the file predates habits, which is not the same as zero. */
  habits: number | null;
  /** Schema the file was written against. */
  version: number;
};

export type ExportPayload = {
  version?: number;
  settings?: Settings;
  blocks: TimeBlock[];
  experiments?: ExperimentSession[];
  todos?: Todo[];
  habits?: Habit[];
  habitChecks?: HabitCheck[];
};

/** Old category ids, so a file written before a rename still restores. */
const RENAMED: Record<string, string> = {
  entertainment: "leisure",
  travel: "transit",
};

const CLOCK = /^\d{1,2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function looksLikeBlock(value: unknown): value is TimeBlock {
  if (!value || typeof value !== "object") return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b.id === "string" &&
    typeof b.date === "string" &&
    DATE.test(b.date) &&
    typeof b.category === "string" &&
    typeof b.startTime === "string" &&
    CLOCK.test(b.startTime) &&
    typeof b.endTime === "string" &&
    CLOCK.test(b.endTime)
  );
}

const TIMES = ["morning", "afternoon", "night"];

/**
 * Moments arrived a version after habits did, so a file that predates them is
 * read as a morning habit rather than rejected.
 */
function readTimes(value: unknown): TimeOfDay[] {
  if (!Array.isArray(value)) return ["morning"];
  const times = value.filter((t): t is TimeOfDay => typeof t === "string" && TIMES.includes(t));
  return times.length > 0 ? times : ["morning"];
}

/** A check carries one moment, not a set. */
function readTime(value: unknown): TimeOfDay {
  return typeof value === "string" && TIMES.includes(value) ? (value as TimeOfDay) : "morning";
}

function looksLikeHabit(value: unknown): value is Habit {
  if (!value || typeof value !== "object") return false;
  const h = value as Record<string, unknown>;
  return (
    typeof h.id === "string" &&
    typeof h.name === "string" &&
    h.name.trim().length > 0 &&
    Array.isArray(h.days) &&
    h.days.length > 0 &&
    h.days.every((d) => typeof d === "number" && d >= 0 && d <= 6)
  );
}

function looksLikeHabitCheck(value: unknown): value is HabitCheck {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return typeof c.habitId === "string" && typeof c.date === "string" && DATE.test(c.date);
}

/**
 * Throws a sentence a person can act on rather than a parser error.
 * Category renames are applied on the way in, so an old backup still lands
 * with the ids this version of the app understands.
 */
export function readExport(json: string): { payload: ExportPayload; summary: ImportSummary } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  if (!raw || typeof raw !== "object" || !Array.isArray((raw as Record<string, unknown>).blocks)) {
    throw new Error("That does not look like a Day Analysis export.");
  }

  const data = raw as Record<string, unknown>;
  const entries = data.blocks as unknown[];
  const valid = entries.filter(looksLikeBlock);
  if (valid.length !== entries.length) {
    const bad = entries.length - valid.length;
    throw new Error(`${bad} of ${entries.length} blocks in that file are malformed, so nothing was imported.`);
  }

  const blocks = valid.map((b) => ({
    ...b,
    category: (RENAMED[b.category] ?? b.category) as TimeBlock["category"],
  }));

  const experiments = Array.isArray(data.experiments) ? (data.experiments as ExperimentSession[]) : [];
  const todos = Array.isArray(data.todos) ? (data.todos as Todo[]) : [];
  const version = typeof data.version === "number" ? data.version : 1;

  // Undefined and empty mean different things here: a file with no habits key
  // was written before habits existed, and importing it must leave the list
  // alone rather than clear it. Absence is carried through as undefined.
  const habits = Array.isArray(data.habits)
    ? (data.habits as Habit[])
        .filter(looksLikeHabit)
        .map((h) => ({ ...h, times: readTimes((h as { times?: unknown }).times) }))
    : undefined;
  const habitChecks = Array.isArray(data.habitChecks)
    ? (data.habitChecks as HabitCheck[]).filter(looksLikeHabitCheck).map((c) => ({
        ...c,
        timeOfDay: readTime((c as { timeOfDay?: unknown }).timeOfDay),
      }))
    : undefined;

  return {
    payload: {
      version,
      settings: (data.settings as Settings | undefined) ?? undefined,
      blocks,
      experiments,
      todos,
      habits,
      habitChecks,
    },
    summary: {
      blocks: blocks.length,
      days: new Set(blocks.map((b) => b.date)).size,
      experiments: experiments.length,
      todos: todos.length,
      habits: habits ? habits.length : null,
      version,
    },
  };
}
