"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Button, Modal } from "@/components/ui/primitives";
import { enabledCategories } from "@/lib/categories";
import { MINUTES_PER_DAY, blockRange, formatDuration, offsetFromDayStart, offsetToClock, toMinutes } from "@/lib/time";
import type { ActivityCategory, Interval, NewTimeBlock, TimeBlock } from "@/types/time";

export type ModalTarget =
  | { mode: "create"; start: number; end: number }
  | { mode: "edit"; block: TimeBlock };

const DURATION_PRESETS = [15, 30, 60, 120];

export function ActivityModal({
  target,
  date,
  interval,
  dayStart,
  categories,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  target: ModalTarget | null;
  date: string;
  interval: Interval;
  dayStart: number;
  categories: ActivityCategory[];
  onClose: () => void;
  onCreate: (input: NewTimeBlock) => Promise<void> | void;
  onUpdate: (id: string, patch: Partial<NewTimeBlock>) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const options = useMemo(() => enabledCategories(categories), [categories]);

  const [category, setCategory] = useState<ActivityCategory>(options[0]?.id ?? "other");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  // Reset the form each time the recorder opens on a new target.
  useEffect(() => {
    if (!target) return;
    if (target.mode === "create") {
      setCategory(options[0]?.id ?? "other");
      setTitle("");
      setStartTime(offsetToClock(target.start, dayStart));
      setEndTime(offsetToClock(target.end, dayStart));
    } else {
      setCategory(target.block.category);
      setTitle(target.block.title ?? "");
      setStartTime(target.block.startTime);
      setEndTime(target.block.endTime);
    }
  }, [target, dayStart, options]);

  const range = blockRange({ startTime, endTime }, dayStart);
  const valid = range.duration > 0;

  const save = async () => {
    if (!target || !valid) return;
    const payload = {
      title: title.trim() || undefined,
      category,
      startTime,
      endTime,
    };
    if (target.mode === "create") {
      await onCreate({ ...payload, date, interval });
    } else {
      await onUpdate(target.block.id, payload);
    }
    onClose();
  };

  const setDuration = (minutes: number) => {
    const startOffset = offsetFromDayStart(toMinutes(startTime), dayStart);
    setEndTime(offsetToClock(Math.min(startOffset + minutes, MINUTES_PER_DAY), dayStart));
  };

  /** Digits pick a category, so a whole recording is three keystrokes. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if (!typing && /^[0-9]$/.test(event.key)) {
      const index = event.key === "0" ? 9 : Number(event.key) - 1;
      const picked = options[index];
      if (picked) {
        event.preventDefault();
        setCategory(picked.id);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    }
  };

  return (
    <Modal open={target !== null} onClose={onClose} labelledBy="activity-modal-title">
      {target ? (
        <div onKeyDown={onKeyDown}>
          <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-5 py-4">
            <h2 id="activity-modal-title" className="text-[15px] font-semibold tracking-[-0.01em]">
              {target.mode === "create" ? "Record time" : "Edit activity"}
            </h2>
            <span className="text-[13px] tabular-nums text-muted">
              {valid ? formatDuration(range.duration) : "Set an end time"}
            </span>
          </div>

          <div className="space-y-5 px-5 py-5">
            <fieldset>
              <legend className="mb-2.5 text-[12.5px] text-muted">Category</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {options.map((option, index) => {
                  const active = option.id === category;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      data-autofocus={index === 0 ? "" : undefined}
                      onClick={() => setCategory(option.id)}
                      aria-pressed={active}
                      title={index < 10 ? `${option.label} (press ${index === 9 ? 0 : index + 1})` : option.label}
                      className={`flex h-[58px] flex-col items-center justify-center gap-1 rounded-lg border px-1 transition-colors ${
                        active
                          ? "border-transparent text-white"
                          : "border-line bg-surface text-ink-soft hover:border-[#cfd4d4]"
                      }`}
                      style={active ? { background: option.color } : undefined}
                    >
                      <CategoryIcon id={option.id} size={16} />
                      <span className="w-full text-center text-[10.5px] leading-[1.15] hyphens-auto">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] text-muted">Activity</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional"
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] text-muted">Start</span>
                <input
                  type="time"
                  step={interval * 60}
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[14px] tabular-nums text-ink focus:border-ink focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] text-muted">End</span>
                <input
                  type="time"
                  step={interval * 60}
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[14px] tabular-nums text-ink focus:border-ink focus:outline-none"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDuration(minutes)}
                  className={`rounded-full border px-2.5 py-1 text-[12px] tabular-nums transition-colors ${
                    range.duration === minutes
                      ? "border-ink bg-ink text-white"
                      : "border-line text-muted hover:border-[#cfd4d4] hover:text-ink"
                  }`}
                >
                  {formatDuration(minutes)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-hairline px-5 py-4">
            {target.mode === "edit" ? (
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  await onDelete(target.block.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            ) : (
              <span className="text-[12px] text-faint">Numbers pick a category. Enter saves.</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" disabled={!valid} onClick={save}>
                {target.mode === "create" ? "Save" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
