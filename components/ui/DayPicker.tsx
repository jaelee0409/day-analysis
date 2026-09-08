"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { useLocale } from "@/lib/locale-context";
import { dateKey, formatDayLong, parseDateKey } from "@/lib/time";

/**
 * The day you are looking at, and a month to move around in.
 *
 * A day with something recorded carries a tick under its number — the same
 * mark the timeline uses for a sub-interval — so the month reads as a record
 * of which days you actually kept, not just a grid of numbers.
 */
export function DayPicker({
  value,
  today,
  tracked,
  onChange,
}: {
  /** Day-window key, "yyyy-MM-dd". */
  value: string;
  today: string;
  /** Every day-window key holding at least one block. */
  tracked: Set<string>;
  onChange: (key: string) => void;
}) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(parseDateKey(value)));
  const wrapRef = useRef<HTMLDivElement>(null);

  // Reopening lands on the month you are looking at, not where you left off.
  useEffect(() => {
    if (open) setMonth(startOfMonth(parseDateKey(value)));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const weeks = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: 6 }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => addDays(first, week * 7 + day)),
    );
  }, [month]);

  const dateLocale = locale === "ko" ? ko : undefined;
  const weekdays = weeks[0].map((day) => format(day, "EEEEE", { locale: dateLocale }));

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={t("calendar.open")}
        className="-mx-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-muted transition-colors hover:bg-[#eceeee] hover:text-ink"
      >
        {formatDayLong(value, locale)}
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-[286px] rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-float)]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              aria-label={t("calendar.previous")}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-[#eceeee] hover:text-ink"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-[13px] font-medium tabular-nums text-ink">
              {format(month, locale === "ko" ? "yyyy년 M월" : "MMMM yyyy", { locale: dateLocale })}
            </span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label={t("calendar.next")}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-[#eceeee] hover:text-ink"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M4.5 2.5 8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-y-1">
            {weekdays.map((label, index) => (
              <span key={index} className="text-center text-[10.5px] text-faint">
                {label}
              </span>
            ))}

            {weeks.flat().map((day) => {
              const key = dateKey(day);
              const outside = !isSameMonth(day, month);
              const future = key > today;
              const selected = key === value;
              const hasData = tracked.has(key);

              return (
                <button
                  key={key}
                  type="button"
                  disabled={future}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  aria-current={selected ? "date" : undefined}
                  title={t(hasData ? "calendar.trackedDay" : "calendar.emptyDay", {
                    date: formatDayLong(key, locale),
                  })}
                  className={`relative mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-md text-[12.5px] tabular-nums transition-colors ${
                    selected
                      ? "bg-ink font-medium text-white"
                      : future
                        ? "cursor-default text-[#d5d9d9]"
                        : outside
                          ? "text-faint hover:bg-[#eceeee]"
                          : "text-ink-soft hover:bg-[#eceeee]"
                  }`}
                >
                  <span className={key === today && !selected ? "font-semibold text-ink" : undefined}>
                    {format(day, "d")}
                  </span>
                  {/* The tick the ruler uses, stood under the number. */}
                  <span
                    className={`absolute bottom-[3px] h-[2px] w-[10px] rounded-full ${
                      hasData ? (selected ? "bg-white/70" : "bg-ink/35") : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-hairline pt-2">
            <span className="text-[11px] text-faint">{t("calendar.legend")}</span>
            <button
              type="button"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
              className="rounded px-1.5 py-0.5 text-[12px] text-muted underline underline-offset-2 hover:text-ink"
            >
              {t("calendar.today")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
