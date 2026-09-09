import { addDays, format, isValid, parse, startOfWeek, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import type { Locale } from "@/lib/i18n";
import type { Interval, TimeBlock, Weekday } from "@/types/time";

/**
 * Formatting is the one place the two languages genuinely diverge in code:
 * "3h 25m" and "3시간 25분" put their units in different places, and Korean
 * dates lead with the month. Everything defaults to English so the pure
 * analysis functions can call these without carrying a locale around.
 */
const DATE_FNS = { en: undefined, ko } as const;

export const MINUTES_PER_DAY = 1440;

/* ------------------------------------------------------------------ *
 * Wall clock <-> minutes
 * ------------------------------------------------------------------ */

/** "07:45" -> 465. Tolerates "7:45" and returns 0 for junk. */
export function toMinutes(clock: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) return 0;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return 0;
  return h * 60 + m;
}

/** 465 -> "07:45". Wraps past midnight so 1500 reads as "01:00". */
export function toClock(minutes: number): string {
  const wrapped = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 205 -> "3h 25m" or "3시간 25분". Whole hours drop the minutes. */
export function formatDuration(minutes: number, locale: Locale = "en"): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (locale === "ko") {
    if (h === 0) return `${m}분`;
    if (m === 0) return `${h}시간`;
    return `${h}시간 ${m}분`;
  }
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Compact form for tight spots in charts: "3h 25m" -> "3.4h". */
export function formatHours(minutes: number, locale: Locale = "en"): string {
  const value = (minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1);
  return locale === "ko" ? `${value}시간` : `${value}h`;
}

/* ------------------------------------------------------------------ *
 * Day windows
 *
 * A personal day does not have to start at midnight. For a day start of
 * 06:00, the window keyed "2026-09-08" runs from 06:00 that morning to
 * 05:59 the next. Every block in that window carries date "2026-09-08",
 * and its position on the timeline is an offset from the window start.
 * ------------------------------------------------------------------ */

/** "yyyy-MM-dd" for a Date. */
export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Parses "yyyy-MM-dd" back to a local Date at midnight. */
export function parseDateKey(key: string): Date {
  const parsed = parse(key, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : new Date();
}

/** The day-window key that `now` currently falls inside. */
export function currentDayKey(dayStartsAt: string, now: Date = new Date()): string {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(dayStartsAt);
  return dateKey(nowMinutes < start ? subDays(now, 1) : now);
}

/**
 * Position of a wall-clock time on a window that begins at `dayStart`,
 * as minutes from the top of the timeline (0 .. 1439).
 */
export function offsetFromDayStart(clockMinutes: number, dayStart: number): number {
  return (((clockMinutes - dayStart) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export type BlockRange = { start: number; end: number; duration: number };

/**
 * A block's span in timeline offsets. An end that lands on or before the
 * start is read as crossing into the next calendar day, so 23:00–01:00
 * measures two hours rather than negative twenty-two.
 */
export function blockRange(block: Pick<TimeBlock, "startTime" | "endTime">, dayStart: number): BlockRange {
  const start = offsetFromDayStart(toMinutes(block.startTime), dayStart);
  let end = offsetFromDayStart(toMinutes(block.endTime), dayStart);
  if (end <= start) end += MINUTES_PER_DAY;
  end = Math.min(end, MINUTES_PER_DAY);
  return { start, end, duration: Math.max(0, end - start) };
}

export function blockDuration(block: Pick<TimeBlock, "startTime" | "endTime">, dayStart: number): number {
  return blockRange(block, dayStart).duration;
}

/** Where "now" sits on today's timeline, or null if the window is not today's. */
export function nowOffset(dayKey: string, dayStartsAt: string, now: Date = new Date()): number | null {
  if (currentDayKey(dayStartsAt, now) !== dayKey) return null;
  return offsetFromDayStart(now.getHours() * 60 + now.getMinutes(), toMinutes(dayStartsAt));
}

/* ------------------------------------------------------------------ *
 * Grid
 * ------------------------------------------------------------------ */

export type Slot = {
  /** Minutes from the top of the timeline. */
  offset: number;
  /** Wall clock label for the slot. */
  clock: string;
  /** True when the slot lands exactly on the hour. */
  isHour: boolean;
};

/** Every slot on a 24-hour timeline at the given resolution. */
export function buildSlots(dayStart: number, interval: Interval): Slot[] {
  const slots: Slot[] = [];
  for (let offset = 0; offset < MINUTES_PER_DAY; offset += interval) {
    const clockMinutes = (dayStart + offset) % MINUTES_PER_DAY;
    slots.push({ offset, clock: toClock(clockMinutes), isHour: clockMinutes % 60 === 0 });
  }
  return slots;
}

/** Rounds an offset down to the nearest grid line. */
export function snap(offset: number, interval: Interval): number {
  return Math.max(0, Math.min(MINUTES_PER_DAY, Math.floor(offset / interval) * interval));
}

/** Converts a timeline offset back to a storable wall clock. */
export function offsetToClock(offset: number, dayStart: number): string {
  return toClock(dayStart + offset);
}

/* ------------------------------------------------------------------ *
 * Calendar helpers
 * ------------------------------------------------------------------ */

/** Human date for a window key: "Monday, September 8" / "9월 8일 월요일". */
export function formatDayLong(key: string, locale: Locale = "en"): string {
  const date = parseDateKey(key);
  return locale === "ko"
    ? format(date, "M월 d일 EEEE", { locale: DATE_FNS.ko })
    : format(date, "EEEE, MMMM d");
}

/** "September 8" / "9월 8일" */
export function formatDayShort(key: string, locale: Locale = "en"): string {
  const date = parseDateKey(key);
  return locale === "ko" ? format(date, "M월 d일", { locale: DATE_FNS.ko }) : format(date, "MMMM d");
}

/** "Mon" / "월" */
export function formatWeekday(key: string, locale: Locale = "en"): string {
  const date = parseDateKey(key);
  return locale === "ko" ? format(date, "EEE", { locale: DATE_FNS.ko }) : format(date, "EEE");
}

/** Which day of the week a window key falls on. 0 = Sunday. */
export function weekdayOf(key: string): Weekday {
  return parseDateKey(key).getDay() as Weekday;
}

/**
 * "Mon" / "월" for a weekday index rather than a date, which is what a
 * schedule picker needs. Anchored on a known Sunday so the lookup goes
 * through date-fns like every other name in this file.
 */
const SUNDAY = new Date(2024, 0, 7);
export function formatWeekdayIndex(day: Weekday, locale: Locale = "en"): string {
  const date = addDays(SUNDAY, day);
  return locale === "ko" ? format(date, "EEE", { locale: DATE_FNS.ko }) : format(date, "EEE");
}

/** The seven window keys of the week containing `key`, Monday first. */
export function weekKeys(key: string): string[] {
  const monday = startOfWeek(parseDateKey(key), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, i)));
}

/** The last `count` window keys ending at `key`, oldest first. */
export function recentKeys(key: string, count: number): string[] {
  const end = parseDateKey(key);
  return Array.from({ length: count }, (_, i) => dateKey(subDays(end, count - 1 - i)));
}
