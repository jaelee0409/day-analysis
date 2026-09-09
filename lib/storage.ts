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
import { EVERY_DAY } from "@/lib/habits";
import { supabase } from "@/lib/supabase";
import { blockRange, offsetToClock } from "@/lib/time";
import type {
  ActivityCategory,
  ExperimentSession,
  Habit,
  HabitCheck,
  NewTimeBlock,
  Settings,
  TimeBlock,
  Todo,
  Weekday,
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

const HABIT_COLUMNS = "id,name,days,position,created_at";

function toHabit(row: Record<string, unknown>): Habit {
  // Postgres hands smallint[] back as numbers; anything outside 0-6 could only
  // come from a hand-edited row, and a habit with no days would never show.
  const days = ((row.days ?? []) as number[]).filter((d) => d >= 0 && d <= 6) as Weekday[];
  return {
    id: row.id as string,
    name: row.name as string,
    days: days.length > 0 ? days : [...EVERY_DAY],
    position: (row.position as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

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

/**
 * What "everything" means, in delete order: habit_checks before habits, since
 * a check points at a habit.
 */
const RECORD_TABLES = ["blocks", "experiment_sessions", "todos"] as const;
const EVERY_TABLE = ["habit_checks", "habits", ...RECORD_TABLES] as const;

async function clearTables(userId: string, tables: readonly string[]): Promise<void> {
  const client = supabase();
  for (const table of tables) {
    const { error } = await client.from(table).delete().eq("user_id", userId);
    fail(`Could not clear ${table}`, error);
  }
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

  /* ---------------- habits ---------------- */

  async getHabits(): Promise<Habit[]> {
    const { data, error } = await supabase()
      .from("habits")
      .select(HABIT_COLUMNS)
      .order("position", { ascending: true });
    fail("Could not read your habits", error);
    return (data ?? []).map((row) => toHabit(row as Record<string, unknown>));
  },

  async createHabit(name: string, days: Weekday[]): Promise<Habit> {
    const userId = await currentUserId();
    const existing = await storage.getHabits();
    const habit: Habit = {
      id: uid(),
      name,
      days,
      position: existing.length,
      createdAt: now(),
    };
    const { error } = await supabase().from("habits").insert({
      id: habit.id,
      user_id: userId,
      name: habit.name,
      days: habit.days,
      position: habit.position,
      created_at: habit.createdAt,
    });
    fail("Could not add that habit", error);
    return habit;
  },

  async updateHabit(id: string, patch: { name?: string; days?: Weekday[] }): Promise<void> {
    const { error } = await supabase().from("habits").update(patch).eq("id", id);
    fail("Could not update that habit", error);
  },

  async deleteHabit(id: string): Promise<void> {
    const { error } = await supabase().from("habits").delete().eq("id", id);
    fail("Could not delete that habit", error);
  },

  /** Ids in the order they should appear. Positions are rewritten to match. */
  async reorderHabits(ids: string[]): Promise<void> {
    const client = supabase();
    for (let index = 0; index < ids.length; index += 1) {
      const { error } = await client.from("habits").update({ position: index }).eq("id", ids[index]);
      fail("Could not reorder your habits", error);
    }
  },

  /** The ids ticked on one day. */
  async getHabitChecks(date: string): Promise<string[]> {
    const { data, error } = await supabase().from("habit_checks").select("habit_id").eq("date", date);
    fail("Could not read what you ticked off", error);
    return (data ?? []).map((row) => row.habit_id as string);
  },

  /** Every check in a run of days, keyed by day. Used by the streak counts. */
  async getHabitChecksForDays(dates: string[]): Promise<Record<string, string[]>> {
    const out: Record<string, string[]> = {};
    for (const date of dates) out[date] = [];
    if (dates.length === 0) return out;

    const { data, error } = await supabase()
      .from("habit_checks")
      .select("habit_id,date")
      .in("date", dates);
    fail("Could not read what you ticked off", error);
    for (const row of data ?? []) {
      const date = row.date as string;
      if (out[date]) out[date].push(row.habit_id as string);
    }
    return out;
  },

  /** Ticking writes a row; unticking removes it. There is no stored false. */
  async setHabitCheck(habitId: string, date: string, checked: boolean): Promise<void> {
    const client = supabase();
    if (!checked) {
      const { error } = await client
        .from("habit_checks")
        .delete()
        .eq("habit_id", habitId)
        .eq("date", date);
      fail("Could not untick that", error);
      return;
    }
    const userId = await currentUserId();
    const { error } = await client
      .from("habit_checks")
      .upsert({ habit_id: habitId, user_id: userId, date, checked_at: now() });
    fail("Could not tick that off", error);
  },

  /* ---------------- whole-account operations ---------------- */

  async exportAll(): Promise<string> {
    const [settings, blocks, experiments, todos, habits, habitChecks] = await Promise.all([
      storage.getSettings(),
      storage.getAllBlocks(),
      storage.getExperimentSessions(),
      storage.getTodos(),
      storage.getHabits(),
      storage.getAllHabitChecks(),
    ]);
    return JSON.stringify(
      { version: 5, exportedAt: now(), settings, blocks, experiments, todos, habits, habitChecks },
      null,
      2,
    );
  },

  async getAllHabitChecks(): Promise<HabitCheck[]> {
    const { data, error } = await supabase().from("habit_checks").select("habit_id,date,checked_at");
    fail("Could not read your habit history", error);
    return (data ?? []).map((row) => ({
      habitId: row.habit_id as string,
      date: row.date as string,
      checkedAt: row.checked_at as string,
    }));
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
    habits?: Habit[];
    habitChecks?: HabitCheck[];
  }): Promise<void> {
    const userId = await currentUserId();
    const client = supabase();

    // A file written before habits existed carries none, and wiping the list
    // to restore nothing would be a silent loss. Habits are only replaced
    // when the file actually has something to put back.
    const restoresHabits = Array.isArray(payload.habits);
    await clearTables(userId, restoresHabits ? EVERY_TABLE : RECORD_TABLES);

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

    if (restoresHabits && payload.habits && payload.habits.length > 0) {
      const { error } = await client.from("habits").insert(
        payload.habits.map((h, index) => ({
          id: h.id,
          user_id: userId,
          name: h.name,
          days: h.days,
          position: h.position ?? index,
          created_at: h.createdAt,
        })),
      );
      fail("Could not import your habits", error);

      // Checks reference habits, so they can only go in once those exist.
      const known = new Set(payload.habits.map((h) => h.id));
      const checks = (payload.habitChecks ?? []).filter((c) => known.has(c.habitId));
      for (let i = 0; i < checks.length; i += 500) {
        const { error: checkError } = await client.from("habit_checks").insert(
          checks.slice(i, i + 500).map((c) => ({
            habit_id: c.habitId,
            user_id: userId,
            date: c.date,
            checked_at: c.checkedAt,
          })),
        );
        fail("Could not import your habit history", checkError);
      }
    }

    if (payload.settings) await storage.saveSettings(payload.settings);
  },

  async clearAll(): Promise<void> {
    await clearTables(await currentUserId(), EVERY_TABLE);
  },
};
