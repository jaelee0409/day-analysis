"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_SETTINGS, storage } from "@/lib/storage";
import { toMinutes } from "@/lib/time";
import type { Settings } from "@/types/time";

type SettingsContextValue = {
  settings: Settings;
  /** Day start expressed in minutes, since almost every caller wants it that way. */
  dayStart: number;
  /** False until the stored settings have been read, so nothing renders on a guess. */
  ready: boolean;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    storage.getSettings().then((stored) => {
      if (cancelled) return;
      setSettings(stored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const saved = await storage.saveSettings(patch);
    setSettings(saved);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, dayStart: toMinutes(settings.dayStartsAt), ready, updateSettings }),
    [settings, ready, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}
