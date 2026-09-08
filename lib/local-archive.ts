"use client";

/**
 * What the browser store still holds from before this app had accounts.
 *
 * Read-only on purpose. Its whole job is to let someone carry the days they
 * already recorded into their account once, and then to get out of the way.
 * Nothing writes here any more.
 */

import type { ExperimentSession, Settings, TimeBlock, Todo } from "@/types/time";
import type { ExportPayload } from "@/lib/import";

const KEYS = {
  blocks: "day-analysis.blocks.v1",
  settings: "day-analysis.settings.v1",
  experiments: "day-analysis.experiments.v1",
  todos: "day-analysis.todos.v1",
  schema: "day-analysis.schema",
  claimed: "day-analysis.local-claimed",
} as const;

/** Old category ids, matching the renames applied to imported files. */
const RENAMED: Record<string, string> = {
  entertainment: "leisure",
  travel: "transit",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export type LocalArchive = {
  payload: ExportPayload;
  blocks: number;
  days: number;
  todos: number;
};

/**
 * The archive, or null when there is nothing worth carrying over — no blocks,
 * or the person already chose what to do with them.
 */
export function readLocalArchive(): LocalArchive | null {
  if (typeof window === "undefined") return null;
  if (window.localStorage.getItem(KEYS.claimed)) return null;

  const stored = read<TimeBlock[]>(KEYS.blocks, []);
  if (stored.length === 0) return null;

  const blocks = stored.map((b) => ({
    ...b,
    category: (RENAMED[b.category] ?? b.category) as TimeBlock["category"],
  }));

  return {
    payload: {
      blocks,
      settings: read<Settings | undefined>(KEYS.settings, undefined),
      experiments: read<ExperimentSession[]>(KEYS.experiments, []),
      todos: read<Todo[]>(KEYS.todos, []),
    },
    blocks: blocks.length,
    days: new Set(blocks.map((b) => b.date)).size,
    todos: read<Todo[]>(KEYS.todos, []).length,
  };
}

/**
 * Stops offering the archive. The data itself is left alone — if the upload
 * went wrong, it is still there to export by hand.
 */
export function dismissLocalArchive(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEYS.claimed, new Date().toISOString());
  } catch {
    // A browser that refuses this will simply offer the archive again.
  }
}
