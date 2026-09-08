"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { storage } from "@/lib/storage";
import { MINUTES_PER_DAY, currentDayKey, nowOffset } from "@/lib/time";
import type { NewTimeBlock, TimeBlock } from "@/types/time";
import { useSettings } from "@/lib/settings-context";

/** A clock that only re-renders when the displayed minute would change. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

/** True once the component has mounted in the browser. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

type DayState = {
  blocks: TimeBlock[];
  loading: boolean;
  addBlock: (input: NewTimeBlock) => Promise<void>;
  editBlock: (id: string, patch: Partial<NewTimeBlock>) => Promise<void>;
  removeBlock: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

/** Loads and mutates one day window. Every write goes back through storage. */
export function useDay(date: string): DayState {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const dateRef = useRef(date);
  dateRef.current = date;

  const reload = useCallback(async () => {
    const loaded = await storage.getBlocks(dateRef.current);
    setBlocks(loaded);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    storage.getBlocks(date).then((loaded) => {
      if (cancelled) return;
      setBlocks(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const addBlock = useCallback(
    async (input: NewTimeBlock) => {
      await storage.createBlock(input);
      await reload();
    },
    [reload],
  );

  const editBlock = useCallback(
    async (id: string, patch: Partial<NewTimeBlock>) => {
      await storage.updateBlock(id, patch);
      await reload();
    },
    [reload],
  );

  const removeBlock = useCallback(
    async (id: string) => {
      await storage.deleteBlock(id);
      await reload();
    },
    [reload],
  );

  return { blocks, loading, addBlock, editBlock, removeBlock, reload };
}

/** The day window in progress, and how much of it has already passed. */
export function useToday() {
  const { settings, dayStart, ready } = useSettings();
  const now = useNow();

  return useMemo(() => {
    const key = currentDayKey(settings.dayStartsAt, now);
    return {
      key,
      now,
      ready,
      dayStart,
      /** Minutes elapsed in the current window. */
      elapsed: nowOffset(key, settings.dayStartsAt, now) ?? MINUTES_PER_DAY,
    };
  }, [settings.dayStartsAt, dayStart, now, ready]);
}
