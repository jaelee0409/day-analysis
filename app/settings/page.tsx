"use client";

import { useRef, useState } from "react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useAuth } from "@/lib/auth-context";
import { Button, Card, PanelTitle, Segmented } from "@/components/ui/primitives";
import { CATEGORIES } from "@/lib/categories";
import { useSettings } from "@/lib/settings-context";
import { readExport, type ImportSummary } from "@/lib/import";
import { storage } from "@/lib/storage";
import { formatDuration, toClock, toMinutes } from "@/lib/time";
import type { ActivityCategory, Interval } from "@/types/time";

const INTERVALS: { value: Interval; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
];

export default function SettingsPage() {
  const { settings, updateSettings, ready } = useSettings();
  const { session, signOut } = useAuth();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [pending, setPending] = useState<{ json: string; summary: ImportSummary } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!ready) return <div className="h-[60vh]" aria-hidden="true" />;

  const dayStart = toMinutes(settings.dayStartsAt);
  const dayEnd = toClock(dayStart + 1439);

  const toggleCategory = (id: ActivityCategory) => {
    const enabled = new Set(settings.enabledCategories);
    if (enabled.has(id)) {
      if (enabled.size === 1) return; // Something has to stay pickable.
      enabled.delete(id);
    } else {
      enabled.add(id);
    }
    void updateSettings({
      enabledCategories: CATEGORIES.filter((c) => enabled.has(c.id)).map((c) => c.id),
    });
  };

  return (
    <div className="max-w-[720px]">
      <header className="mb-7">
        <p className="text-[13px] text-muted">Settings</p>
        <h1 className="ask mt-1.5 text-[clamp(28px,4vw,38px)] text-ink">How should the day be measured?</h1>
      </header>

      <div className="grid gap-5">
        <Card className="p-5">
          <PanelTitle aside={`${1440 / settings.interval} slots a day`}>Time interval</PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            The resolution of the timeline grid. Finer grids record more precisely; coarser grids are quicker
            to fill in.
          </p>
          <div className="mt-4">
            <Segmented
              options={INTERVALS}
              value={settings.interval}
              onChange={(interval) => void updateSettings({ interval })}
              label="Time interval"
            />
          </div>
        </Card>

        <Card className="p-5">
          <PanelTitle aside={`runs to ${dayEnd}`}>Day starts at</PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            Where your timeline begins. Set it to when you usually wake, and a late night stays attached to
            the day it belongs to instead of splitting across midnight.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="time"
              step={3600}
              value={settings.dayStartsAt}
              onChange={(event) => void updateSettings({ dayStartsAt: event.target.value || "06:00" })}
              className="h-10 w-[130px] rounded-lg border border-line bg-surface px-3 text-[14px] tabular-nums text-ink focus:border-ink focus:outline-none"
            />
            <span className="text-[13px] text-faint">
              {settings.dayStartsAt} to {dayEnd}, {formatDuration(1440)} in all
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <PanelTitle aside={`${settings.enabledCategories.length} of ${CATEGORIES.length} on`}>
            Categories
          </PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            Turn off what you never use. Fewer choices in the recorder means a faster entry. Time already
            recorded under a category you switch off is kept and still counted.
          </p>
          <ul className="mt-4 divide-y divide-hairline">
            {CATEGORIES.map((meta) => {
              const enabled = settings.enabledCategories.includes(meta.id);
              return (
                <li key={meta.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="shrink-0 transition-colors"
                    style={{ color: enabled ? meta.color : "#c3c8c8" }}
                  >
                    <CategoryIcon id={meta.id} size={16} />
                  </span>
                  <span className={`text-[13.5px] ${enabled ? "text-ink" : "text-faint"}`}>{meta.label}</span>
                  {meta.productive ? (
                    <span className="text-[11.5px] text-faint">counts as focused work</span>
                  ) : null}
                  <label className="ml-auto flex cursor-pointer items-center gap-2">
                    <span className="sr-only">Enable {meta.label}</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleCategory(meta.id)}
                      className="peer sr-only"
                    />
                    <span className="relative h-[22px] w-[38px] rounded-full bg-[#dde1e1] transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(21,23,26,0.2)] after:transition-transform after:content-[''] peer-checked:bg-ink peer-checked:after:translate-x-[16px] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink" />
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-5">
          <PanelTitle aside={session?.user.email ?? undefined}>Account</PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            Your days live in your account, so this browser and your phone show the same record. Nobody
            else can read it.
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <PanelTitle>Your data</PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            Export a copy whenever you want one of your own. Importing replaces everything in your
            account, so it restores a backup rather than merging one in.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const json = await storage.exportAll();
                const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
                const link = document.createElement("a");
                link.href = url;
                link.download = `day-analysis-${new Date().toISOString().slice(0, 10)}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export JSON
            </Button>

            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setImportError(null);
                setPending(null);
                try {
                  const json = await file.text();
                  setPending({ json, summary: readExport(json).summary });
                } catch (error) {
                  setImportError(error instanceof Error ? error.message : "That file could not be read.");
                }
              }}
            />

            {confirmingReset ? (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    await storage.clearAll();
                    setConfirmingReset(false);
                    window.location.reload();
                  }}
                >
                  Delete everything
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(false)}>
                  Keep it
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(true)}>
                Clear all data
              </Button>
            )}
          </div>

          {importError ? (
            <p className="mt-3 text-[13px] font-medium text-ink" role="alert">
              {importError}
            </p>
          ) : null}

          {pending ? (
            <div className="mt-4 rounded-xl border border-line bg-[#fafbfb] p-4">
              <p className="text-[13.5px] leading-relaxed text-ink-soft">
                That file holds{" "}
                <span className="font-medium tabular-nums text-ink">
                  {pending.summary.blocks} {pending.summary.blocks === 1 ? "block" : "blocks"}
                </span>{" "}
                across{" "}
                <span className="font-medium tabular-nums text-ink">
                  {pending.summary.days} {pending.summary.days === 1 ? "day" : "days"}
                </span>
                {pending.summary.todos > 0
                  ? `, ${pending.summary.todos} ${pending.summary.todos === 1 ? "reminder" : "reminders"}`
                  : ""}
                {pending.summary.experiments > 0
                  ? `, ${pending.summary.experiments} experiment ${
                      pending.summary.experiments === 1 ? "run" : "runs"
                    }`
                  : ""}
                .
                Importing replaces everything in this browser.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    await storage.replaceAll(readExport(pending.json).payload);
                    window.location.reload();
                  }}
                >
                  Replace everything
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
