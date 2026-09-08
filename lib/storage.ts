/**
 * The only module in the app that touches localStorage.
 *
 * Every function is async and returns plain domain objects, so the browser
 * store can be swapped for a fetch against a Next.js API route backed by
 * Postgres without a single component changing. Nothing above this layer
 * may read or write the browser store directly.
 */

import { ALL_CATEGORY_IDS } from "@/lib/categories";
import { blockRange, offsetToClock, toMinutes } from "@/lib/time";
import type {
  ActivityCategory,
  ExperimentSession,
  NewTimeBlock,
  Settings,
  TimeBlock,
  Todo,
} from "@/types/time";

const KEYS = {
  blocks: "day-analysis.blocks.v1",
  settings: "day-analysis.settings.v1",
  experiments: "day-analysis.experiments.v1",
  todos: "day-analysis.todos.v1",
  schema: "day-analysis.schema",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  interval: 15,
  dayStartsAt: "00:00",
  enabledCategories: [...ALL_CATEGORY_IDS],
};

/* ------------------------------------------------------------------ *
 * Raw access
 * ------------------------------------------------------------------ */

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private-mode failures are not worth crashing a save over.
  }
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ *
 * Schema migration
 *
 * Category ids live in recorded data, so renaming one has to bring the
 * existing blocks with it. Migration runs once per browser, in place, before
 * the first read.
 * ------------------------------------------------------------------ */

type Migration = {
  version: number;
  /** Old category id -> current id. */
  renames?: Record<string, ActivityCategory>;
  /** Categories introduced here, switched on for people who already had settings. */
  added?: ActivityCategory[];
};

/** Applied in order, and only the ones newer than what the browser holds. */
const MIGRATIONS: Migration[] = [
  { version: 2, renames: { entertainment: "leisure" }, added: ["hygiene"] },
  { version: 3, renames: { travel: "transit" } },
  { version: 4, added: ["chores"] },
];

const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

let migrationChecked = false;

function ensureMigrated(): void {
  if (migrationChecked || typeof window === "undefined") return;
  migrationChecked = true;

  const from = read<number>(KEYS.schema, 1);
  const pending = MIGRATIONS.filter((m) => m.version > from);
  if (pending.length === 0) return;

  const renames: Record<string, ActivityCategory> = {};
  const added: ActivityCategory[] = [];
  for (const step of pending) {
    Object.assign(renames, step.renames ?? {});
    added.push(...(step.added ?? []));
  }

  const rename = (id: string): ActivityCategory => renames[id] ?? (id as ActivityCategory);

  const blocks = read<TimeBlock[]>(KEYS.blocks, []);
  if (blocks.some((b) => b.category in renames)) {
    write(
      KEYS.blocks,
      blocks.map((b) => ({ ...b, category: rename(b.category) })),
    );
  }

  // Carry renames through the stored list, and opt the person into anything
  // new rather than hiding a category they never chose to switch off.
  const stored = read<Partial<Settings>>(KEYS.settings, {});
  if (Array.isArray(stored.enabledCategories)) {
    const carried = stored.enabledCategories.map(rename);
    write(KEYS.settings, {
      ...stored,
      enabledCategories: [...carried, ...added.filter((id) => !carried.includes(id))],
    });
  }

  write(KEYS.schema, SCHEMA_VERSION);
}

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

function readSettings(): Settings {
  const stored = read<Partial<Settings>>(KEYS.settings, {});
  const enabled =
    Array.isArray(stored.enabledCategories) && stored.enabledCategories.length > 0
      ? stored.enabledCategories.filter((c) => ALL_CATEGORY_IDS.includes(c))
      : DEFAULT_SETTINGS.enabledCategories;
  return {
    interval: stored.interval === 30 || stored.interval === 60 ? stored.interval : 15,
    dayStartsAt: typeof stored.dayStartsAt === "string" ? stored.dayStartsAt : DEFAULT_SETTINGS.dayStartsAt,
    enabledCategories: enabled,
  };
}

/* ------------------------------------------------------------------ *
 * Overlap resolution
 *
 * Recording time has to be faster than ignoring it, so a new block simply
 * wins: anything it covers is trimmed, split, or dropped rather than
 * bounced back to the user as a validation error.
 * ------------------------------------------------------------------ */

/**
 * What a new block does to the blocks already there, expressed as a change set
 * rather than a rewritten world.
 *
 * The browser store could get away with handing back the whole array, because
 * writing it costs the same either way. A database cannot: saving one block
 * would rewrite every row you own. Naming the three specific effects keeps the
 * localStorage path honest and lets the Postgres one issue three statements.
 */
export type BlockDiff = {
  /** Ids of blocks the new one swallowed whole. */
  deleted: string[];
  /** Blocks trimmed at one end. */
  updated: TimeBlock[];
  /** Tails created when the new block landed inside an existing one. */
  inserted: TimeBlock[];
};

export function resolveOverlaps(existing: TimeBlock[], incoming: TimeBlock, dayStart: number): BlockDiff {
  const diff: BlockDiff = { deleted: [], updated: [], inserted: [] };
  const next = blockRange(incoming, dayStart);
  if (next.duration <= 0) return diff;

  for (const block of existing) {
    if (block.id === incoming.id || block.date !== incoming.date) continue;

    const range = blockRange(block, dayStart);
    if (range.end <= next.start || range.start >= next.end) continue;

    if (range.start >= next.start && range.end <= next.end) {
      diff.deleted.push(block.id);
      continue;
    }

    const stamp = now();
    if (range.start < next.start && range.end > next.end) {
      // The new block lands in the middle: keep the head, insert the tail.
      diff.updated.push({ ...block, endTime: offsetToClock(next.start, dayStart), updatedAt: stamp });
      diff.inserted.push({
        ...block,
        id: uid(),
        startTime: offsetToClock(next.end, dayStart),
        createdAt: stamp,
        updatedAt: stamp,
      });
      continue;
    }

    if (range.start < next.start) {
      diff.updated.push({ ...block, endTime: offsetToClock(next.start, dayStart), updatedAt: stamp });
    } else {
      diff.updated.push({ ...block, startTime: offsetToClock(next.end, dayStart), updatedAt: stamp });
    }
  }

  return diff;
}

/** Replays a diff over an in-memory array. The database replays it as SQL. */
function applyDiff(blocks: TimeBlock[], diff: BlockDiff): TimeBlock[] {
  const removed = new Set(diff.deleted);
  const updates = new Map(diff.updated.map((b) => [b.id, b]));
  return [
    ...blocks.filter((b) => !removed.has(b.id)).map((b) => updates.get(b.id) ?? b),
    ...diff.inserted,
  ];
}

function sortBlocks(blocks: TimeBlock[], dayStart: number): TimeBlock[] {
  return [...blocks].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return blockRange(a, dayStart).start - blockRange(b, dayStart).start;
  });
}

/* ------------------------------------------------------------------ *
 * Import
 *
 * A restore replaces rather than merges. Two datasets recorded on two devices
 * cannot be reconciled honestly — the same afternoon may hold different blocks
 * in each — so the file wins outright and the UI says so before it happens.
 * ------------------------------------------------------------------ */

export type ImportSummary = {
  blocks: number;
  days: number;
  experiments: number;
  todos: number;
  /** Schema the file was written against; migrations run after it lands. */
  version: number;
};

type ExportPayload = {
  version?: number;
  settings?: Settings;
  blocks: TimeBlock[];
  experiments?: ExperimentSession[];
  todos?: Todo[];
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
 * Reads an export without writing anything, so the UI can say what is in the
 * file before it replaces what is already here. Throws a sentence a person can
 * act on rather than a parser error.
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
  const blocks = entries.filter(looksLikeBlock);
  if (blocks.length !== entries.length) {
    const bad = entries.length - blocks.length;
    throw new Error(`${bad} of ${entries.length} blocks in that file are malformed, so nothing was imported.`);
  }

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

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

export const storage = {
  async getSettings(): Promise<Settings> {
    ensureMigrated();
    return readSettings();
  },

  async saveSettings(patch: Partial<Settings>): Promise<Settings> {
    ensureMigrated();
    const merged = { ...readSettings(), ...patch };
    write(KEYS.settings, merged);
    return merged;
  },

  async getAllBlocks(): Promise<TimeBlock[]> {
    ensureMigrated();
    return read<TimeBlock[]>(KEYS.blocks, []);
  },

  async getBlocks(date: string, dayStart: number): Promise<TimeBlock[]> {
    ensureMigrated();
    const all = read<TimeBlock[]>(KEYS.blocks, []);
    return sortBlocks(
      all.filter((b) => b.date === date),
      dayStart,
    );
  },

  /** One round trip for a set of days, which is what History and Dashboard need. */
  async getBlocksForDays(dates: string[], dayStart: number): Promise<Record<string, TimeBlock[]>> {
    ensureMigrated();
    const wanted = new Set(dates);
    const grouped: Record<string, TimeBlock[]> = {};
    for (const date of dates) grouped[date] = [];
    for (const block of read<TimeBlock[]>(KEYS.blocks, [])) {
      if (wanted.has(block.date)) grouped[block.date].push(block);
    }
    for (const date of dates) grouped[date] = sortBlocks(grouped[date], dayStart);
    return grouped;
  },

  async createBlock(input: NewTimeBlock, dayStart: number): Promise<TimeBlock> {
    ensureMigrated();
    const stamp = now();
    const block: TimeBlock = { ...input, id: uid(), createdAt: stamp, updatedAt: stamp };
    const all = read<TimeBlock[]>(KEYS.blocks, []);
    write(KEYS.blocks, [...applyDiff(all, resolveOverlaps(all, block, dayStart)), block]);
    return block;
  },

  async updateBlock(id: string, patch: Partial<NewTimeBlock>, dayStart: number): Promise<TimeBlock | null> {
    ensureMigrated();
    const all = read<TimeBlock[]>(KEYS.blocks, []);
    const existing = all.find((b) => b.id === id);
    if (!existing) return null;

    const updated: TimeBlock = { ...existing, ...patch, updatedAt: now() };
    const others = all.filter((b) => b.id !== id);
    write(KEYS.blocks, [...applyDiff(others, resolveOverlaps(others, updated, dayStart)), updated]);
    return updated;
  },

  async deleteBlock(id: string): Promise<void> {
    const all = read<TimeBlock[]>(KEYS.blocks, []);
    write(
      KEYS.blocks,
      all.filter((b) => b.id !== id),
    );
  },

  /** Every day-window key holding at least one block, newest first. */
  async getTrackedDays(): Promise<string[]> {
    ensureMigrated();
    const days = new Set(read<TimeBlock[]>(KEYS.blocks, []).map((b) => b.date));
    return [...days].sort((a, b) => (a < b ? 1 : -1));
  },

  async getExperimentSessions(): Promise<ExperimentSession[]> {
    ensureMigrated();
    return read<ExperimentSession[]>(KEYS.experiments, []);
  },

  async createExperimentSession(input: Omit<ExperimentSession, "id">): Promise<ExperimentSession> {
    const session: ExperimentSession = { ...input, id: uid() };
    write(KEYS.experiments, [...read<ExperimentSession[]>(KEYS.experiments, []), session]);
    return session;
  },

  async clearExperimentSessions(): Promise<void> {
    write(KEYS.experiments, []);
  },

  /* ---------------- reminders ---------------- */

  async getTodos(): Promise<Todo[]> {
    return read<Todo[]>(KEYS.todos, []);
  },

  async createTodo(text: string): Promise<Todo> {
    const todo: Todo = { id: uid(), text, done: false, createdAt: now() };
    write(KEYS.todos, [...read<Todo[]>(KEYS.todos, []), todo]);
    return todo;
  },

  async setTodoDone(id: string, done: boolean): Promise<void> {
    write(
      KEYS.todos,
      read<Todo[]>(KEYS.todos, []).map((t) =>
        t.id === id ? { ...t, done, completedAt: done ? now() : undefined } : t,
      ),
    );
  },

  async deleteTodo(id: string): Promise<void> {
    write(
      KEYS.todos,
      read<Todo[]>(KEYS.todos, []).filter((t) => t.id !== id),
    );
  },

  async clearDoneTodos(): Promise<void> {
    write(
      KEYS.todos,
      read<Todo[]>(KEYS.todos, []).filter((t) => !t.done),
    );
  },

  async exportAll(): Promise<string> {
    ensureMigrated();
    return JSON.stringify(
      {
        version: SCHEMA_VERSION,
        exportedAt: now(),
        settings: readSettings(),
        blocks: read<TimeBlock[]>(KEYS.blocks, []),
        experiments: read<ExperimentSession[]>(KEYS.experiments, []),
        todos: read<Todo[]>(KEYS.todos, []),
      },
      null,
      2,
    );
  },

  /** Reads a file without touching what is stored. */
  async inspectImport(json: string): Promise<ImportSummary> {
    return readExport(json).summary;
  },

  async importAll(json: string): Promise<ImportSummary> {
    const { payload, summary } = readExport(json);

    write(KEYS.blocks, payload.blocks);
    write(KEYS.experiments, payload.experiments ?? []);
    write(KEYS.todos, payload.todos ?? []);
    if (payload.settings) write(KEYS.settings, payload.settings);

    // The file may predate the current schema, so let the chain run over it.
    write(KEYS.schema, summary.version);
    migrationChecked = false;
    ensureMigrated();

    return summary;
  },

  async clearAll(): Promise<void> {
    write(KEYS.blocks, []);
    write(KEYS.todos, []);
    write(KEYS.schema, SCHEMA_VERSION);
    write(KEYS.experiments, []);
    write(KEYS.settings, DEFAULT_SETTINGS);
  },
};
