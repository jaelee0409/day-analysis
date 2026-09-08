"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Keeping two devices honest with each other.
 *
 * Two layers, because they fail in different ways:
 *
 *   1. Coming back to a tab refetches. This is the case that actually bites —
 *      record on the phone, look at the laptop, and the laptop is stale. It
 *      needs no database configuration and cannot silently stop working.
 *
 *   2. A Postgres change feed updates a screen while it is still open. This
 *      needs the table added to the `supabase_realtime` publication; without
 *      that the channel simply never fires, and layer one still covers you.
 *      See supabase/realtime.sql.
 */

/** Refetches when the tab is looked at again, or the network comes back. */
export function useRefreshOnReturn(refresh: () => void): void {
  const latest = useRef(refresh);
  latest.current = refresh;

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") latest.current();
    };
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
    };
  }, []);
}

/**
 * Live updates for one table. Every subscriber gets its own channel name so
 * two hooks watching the same table do not collide.
 */
export function useLiveTable(table: string, refresh: () => void): void {
  const latest = useRef(refresh);
  latest.current = refresh;

  useEffect(() => {
    const channel = supabase()
      .channel(`live:${table}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => latest.current())
      .subscribe();

    return () => {
      void supabase().removeChannel(channel);
    };
  }, [table]);
}
