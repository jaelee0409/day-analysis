/**
 * Reading an export, without writing anything.
 *
 * Kept apart from `storage.ts` because it is pure parsing: it validates a file
 * and describes it so the UI can say what is in it before anything is
 * replaced. Nothing here touches Supabase or the browser store.
 */

import type { ExperimentSession, Settings, TimeBlock, Todo } from "@/types/time";

export type ImportSummary = {
  blocks: number;
  days: number;
  experiments: number;
  todos: number;
  /** Schema the file was written against. */
  version: number;
};

export type ExportPayload = {
  version?: number;
  settings?: Settings;
  blocks: TimeBlock[];
  experiments?: ExperimentSession[];
  todos?: Todo[];
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

  return {
    payload: {
      version,
      settings: (data.settings as Settings | undefined) ?? undefined,
      blocks,
      experiments,
      todos,
    },
    summary: {
      blocks: blocks.length,
      days: new Set(blocks.map((b) => b.date)).size,
      experiments: experiments.length,
      todos: todos.length,
      version,
    },
  };
}
