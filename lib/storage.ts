/**
 * The only module that knows where the data lives.
 *
 * It now talks to Supabase rather than localStorage, but every signature is
 * the one the app already used, so no page, hook, or analysis function changed
 * when the store moved. Row Level Security means there is no API route in
 * between: the browser carries the user's JWT and Postgres refuses anyone
 * else's rows.
 *
 * The old browser store still exists, read-only, in `lib/local-archive.ts` —
 * it is what an account is seeded from the first time someone signs in.
 */

import { ALL_CATEGORY_IDS } from "@/lib/categories";
import { supabase } from "@/lib/supabase";
import { blockRange, offsetToClock } from "@/lib/time";
import type {
  ActivityCategory,
  ExperimentSession,
  NewTimeBlock,
  Settings,
  TimeBlock,
  Todo,
} from "@/types/time";

export const DEFAULT_SETTINGS: Settings = {
  interval: 15,
  dayStartsAt: "00:00",
  enabledCategories: [...ALL_CATEGORY_IDS],
};

/* ------------------------------------------------------------------ *
 * Rows in, domain objects out
 * ------------------------------------------------------------------ */

type BlockRow = {
  id: string;
  date: string;
  title: string | null;
  category: string;
  start_time: string;
  end_time: string;
  interval: number;
  created_at: string;
  updated_at: string;
};

function toBlock(row: BlockRow): TimeBlock {
  return {
    id: row.id,
    date: row.date,
    title: row.title ?? undefined,
    category: row.category as ActivityCategory,
    startTime: row.start_time,
    endTime: row.end_time,
    interval: row.interval as TimeBlock["interval"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBlockRow(block: TimeBlock, userId: string) {
  return {
    id: block.id,
    user_id: userId,
    date: block.date,
    title: block.title ?? null,
    category: block.category,
    start_time: block.startTime,
    end_time: block.endTime,
    interval: block.interval,
    created_at: block.createdAt,
    updated_at: block.updatedAt,
  };
}

const BLOCK_COLUMNS = "id,date,title,category,start_time,end_time,interval,created_at,updated_at";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

/** The signed-in user, read from the cached session rather than the network. */
async function currentUserId(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/* ------------------------------------------------------------------ *
 * Overlap resolution
 *
 * Recording time has to be faster than ignoring it, so a new block simply
 * wins: anything it covers is trimmed, split, or dropped rather than bounced
 * back as a validation error.
 *
 * The result is a change set rather than a rewritten world, because saving one
 * block must not rewrite every row the account owns.
 * ------------------------------------------------------------------ */

export type BlockDiff = {
  deleted: string[];
  updated: TimeBlock[];
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

/** Sends a change set as three statements at most, rather than a table rewrite. */
async function applyDiff(diff: BlockDiff, userId: string): Promise<void> {
  const client = supabase();

  if (diff.deleted.length > 0) {
    const { error } = await client.from("blocks").delete().in("id", diff.deleted);
    fail("Could not remove the blocks this one covered", error);
  }
  if (diff.updated.length > 0) {
    const { error } = await client.from("blocks").upsert(diff.updated.map((b) => toBlockRow(b, userId)));
    fail("Could not trim the blocks this one overlapped", error);
  }
  if (diff.inserted.length > 0) {
    const { error } = await client.from("blocks").insert(diff.inserted.map((b) => toBlockRow(b, userId)));
    fail("Could not split the block this one landed inside", error);
  }
}

function sortBlocks(blocks: TimeBlock[], dayStart: number): TimeBlock[] {
  return [...blocks].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return blockRange(a, dayStart).start - blockRange(b, dayStart).start;
  });
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

export const storage = {
  async getSettings(): Promise<Settings> {
    const userId = await currentUserId();
    const { data, error } = await supabase()
      .from("settings")
      .select("interval,day_starts_at,enabled_categories")
      .eq("user_id", userId)
      .maybeSingle();
    fail("Could not read your settings", error);

    if (!data) return DEFAULT_SETTINGS;
    const enabled = ((data.enabled_categories ?? []) as ActivityCategory[]).filter((c) =>
      ALL_CATEGORY_IDS.includes(c),
    );
    return {
      interval: data.interval === 30 || data.interval === 60 ? data.interval : 15,
      dayStartsAt: data.day_starts_at ?? DEFAULT_SETTINGS.dayStartsAt,
      enabledCategories: enabled.length > 0 ? enabled : DEFAULT_SETTINGS.enabledCategories,
    };
  },

  async saveSettings(patch: Partial<Settings>): Promise<Settings> {
    const userId = await currentUserId();
    const merged = { ...(await storage.getSettings()), ...patch };
    const { error } = await supabase().from("settings").upsert({
      user_id: userId,
      interval: merged.interval,
      day_starts_at: merged.dayStartsAt,
      enabled_categories: merged.enabledCategories,
    });
    fail("Could not save your settings", error);
    return merged;
  },

  async getAllBlocks(): Promise<TimeBlock[]> {
    const { data, error } = await supabase().from("blocks").select(BLOCK_COLUMNS);
    fail("Could not read your blocks", error);
    return ((data ?? []) as BlockRow[]).map(toBlock);
  },

  async getBlocks(date: string, dayStart: number): Promise<TimeBlock[]> {
    const { data, error } = await supabase().from("blocks").select(BLOCK_COLUMNS).eq("date", date);
    fail("Could not read that day", error);
    return sortBlocks(((data ?? []) as BlockRow[]).map(toBlock), dayStart);
  },

  /** One round trip for a set of days, which is what History and Dashboard need. */
  async getBlocksForDays(dates: string[], dayStart: number): Promise<Record<string, TimeBlock[]>> {
    const grouped: Record<string, TimeBlock[]> = {};
    for (const date of dates) grouped[date] = [];
    if (dates.length === 0) return grouped;

    const { data, error } = await supabase().from("blocks").select(BLOCK_COLUMNS).in("date", dates);
    fail("Could not read those days", error);

    for (const row of (data ?? []) as BlockRow[]) {
      const block = toBlock(row);
      if (grouped[block.date]) grouped[block.date].push(block);
    }
    for (const date of dates) grouped[date] = sortBlocks(grouped[date], dayStart);
    return grouped;
  },

  async createBlock(input: NewTimeBlock, dayStart: number): Promise<TimeBlock> {
    const userId = await currentUserId();
    const stamp = now();
    const block: TimeBlock = { ...input, id: uid(), createdAt: stamp, updatedAt: stamp };

    const existing = await storage.getBlocks(input.date, dayStart);
    await applyDiff(resolveOverlaps(existing, block, dayStart), userId);

    const { error } = await supabase().from("blocks").insert(toBlockRow(block, userId));
    fail("Could not record that block", error);
    return block;
  },

  async updateBlock(
    id: string,
    patch: Partial<NewTimeBlock>,
    dayStart: number,
  ): Promise<TimeBlock | null> {
    const userId = await currentUserId();
    const { data, error } = await supabase()
      .from("blocks")
      .select(BLOCK_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    fail("Could not find that block", error);
    if (!data) return null;

    const updated: TimeBlock = { ...toBlock(data as BlockRow), ...patch, updatedAt: now() };
    const others = (await storage.getBlocks(updated.date, dayStart)).filter((b) => b.id !== id);
    await applyDiff(resolveOverlaps(others, updated, dayStart), userId);

    const { error: saveError } = await supabase().from("blocks").upsert(toBlockRow(updated, userId));
    fail("Could not save that block", saveError);
    return updated;
  },

  async deleteBlock(id: string): Promise<void> {
    const { error } = await supabase().from("blocks").delete().eq("id", id);
    fail("Could not delete that block", error);
  },

  /** Every day-window key holding at least one block, newest first. */
  async getTrackedDays(): Promise<string[]> {
    const { data, error } = await supabase()
      .from("blocks")
      .select("date")
      .order("date", { ascending: false });
    fail("Could not read your days", error);
    return [...new Set(((data ?? []) as { date: string }[]).map((row) => row.date))];
  },

  async getExperimentSessions(): Promise<ExperimentSession[]> {
    const { data, error } = await supabase()
      .from("experiment_sessions")
      .select("id,date,block_size,started_at,ended_at,elapsed_minutes,outcome,note")
      .order("started_at", { ascending: true });
    fail("Could not read your experiment runs", error);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      date: row.date as string,
      blockSize: row.block_size as ExperimentSession["blockSize"],
      startedAt: row.started_at as string,
      endedAt: row.ended_at as string,
      elapsedMinutes: row.elapsed_minutes as number,
      outcome: row.outcome as ExperimentSession["outcome"],
      note: (row.note as string | null) ?? undefined,
    }));
  },

  async createExperimentSession(input: Omit<ExperimentSession, "id">): Promise<ExperimentSession> {
    const userId = await currentUserId();
    const session: ExperimentSession = { ...input, id: uid() };
    const { error } = await supabase().from("experiment_sessions").insert({
      id: session.id,
      user_id: userId,
      date: session.date,
      block_size: session.blockSize,
      started_at: session.startedAt,
      ended_at: session.endedAt,
      elapsed_minutes: session.elapsedMinutes,
      outcome: session.outcome,
      note: session.note ?? null,
    });
    fail("Could not record that run", error);
    return session;
  },

  async clearExperimentSessions(): Promise<void> {
    const userId = await currentUserId();
    const { error } = await supabase().from("experiment_sessions").delete().eq("user_id", userId);
    fail("Could not clear your experiment runs", error);
  },

  /* ---------------- reminders ---------------- */

  async getTodos(): Promise<Todo[]> {
    const { data, error } = await supabase()
      .from("todos")
      .select("id,text,done,created_at,completed_at")
      .order("created_at", { ascending: true });
    fail("Could not read your reminders", error);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      text: row.text as string,
      done: row.done as boolean,
      createdAt: row.created_at as string,
      completedAt: (row.completed_at as string | null) ?? undefined,
    }));
  },

  async createTodo(text: string): Promise<Todo> {
    const userId = await currentUserId();
    const todo: Todo = { id: uid(), text, done: false, createdAt: now() };
    const { error } = await supabase().from("todos").insert({
      id: todo.id,
      user_id: userId,
      text: todo.text,
      done: false,
      created_at: todo.createdAt,
    });
    fail("Could not add that reminder", error);
    return todo;
  },

  async setTodoDone(id: string, done: boolean): Promise<void> {
    const { error } = await supabase()
      .from("todos")
      .update({ done, completed_at: done ? now() : null })
      .eq("id", id);
    fail("Could not update that reminder", error);
  },

  async deleteTodo(id: string): Promise<void> {
    const { error } = await supabase().from("todos").delete().eq("id", id);
    fail("Could not delete that reminder", error);
  },

  async clearDoneTodos(): Promise<void> {
    const userId = await currentUserId();
    const { error } = await supabase().from("todos").delete().eq("user_id", userId).eq("done", true);
    fail("Could not clear finished reminders", error);
  },

  /* ---------------- whole-account operations ---------------- */

  async exportAll(): Promise<string> {
    const [settings, blocks, experiments, todos] = await Promise.all([
      storage.getSettings(),
      storage.getAllBlocks(),
      storage.getExperimentSessions(),
      storage.getTodos(),
    ]);
    return JSON.stringify({ version: 4, exportedAt: now(), settings, blocks, experiments, todos }, null, 2);
  },

  /**
   * Replaces everything this account holds with the contents of an export.
   * The blocks in a export were already resolved against each other, so they
   * go in as they are rather than back through the overlap rules one by one.
   */
  async replaceAll(payload: {
    settings?: Settings;
    blocks: TimeBlock[];
    experiments?: ExperimentSession[];
    todos?: Todo[];
  }): Promise<void> {
    const userId = await currentUserId();
    const client = supabase();

    await storage.clearAll();

    for (let i = 0; i < payload.blocks.length; i += 500) {
      const chunk = payload.blocks.slice(i, i + 500).map((b) => toBlockRow(b, userId));
      const { error } = await client.from("blocks").insert(chunk);
      fail("Could not import your blocks", error);
    }

    if (payload.experiments && payload.experiments.length > 0) {
      const { error } = await client.from("experiment_sessions").insert(
        payload.experiments.map((s) => ({
          id: s.id,
          user_id: userId,
          date: s.date,
          block_size: s.blockSize,
          started_at: s.startedAt,
          ended_at: s.endedAt,
          elapsed_minutes: s.elapsedMinutes,
          outcome: s.outcome,
          note: s.note ?? null,
        })),
      );
      fail("Could not import your experiment runs", error);
    }

    if (payload.todos && payload.todos.length > 0) {
      const { error } = await client.from("todos").insert(
        payload.todos.map((t) => ({
          id: t.id,
          user_id: userId,
          text: t.text,
          done: t.done,
          created_at: t.createdAt,
          completed_at: t.completedAt ?? null,
        })),
      );
      fail("Could not import your reminders", error);
    }

    if (payload.settings) await storage.saveSettings(payload.settings);
  },

  async clearAll(): Promise<void> {
    const userId = await currentUserId();
    const client = supabase();
    for (const table of ["blocks", "experiment_sessions", "todos"]) {
      const { error } = await client.from(table).delete().eq("user_id", userId);
      fail(`Could not clear ${table}`, error);
    }
  },
};
