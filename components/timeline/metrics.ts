import type { Interval } from "@/types/time";

/**
 * The timeline is drawn to scale: a two-hour block is exactly twice the
 * height of a one-hour block. Each grid resolution gets a slot height that
 * stays legible, and everything else is derived from it.
 */
export const SLOT_HEIGHT: Record<Interval, number> = { 15: 28, 30: 40, 60: 56 };

/** Width of the ruler gutter that carries the tick marks and time labels. */
export const GUTTER = 66;

/** The day is read as two halves standing side by side. */
export const COLUMN_SPAN = 720;

/** Offset each half begins at, in minutes from the start of the day window. */
export const COLUMNS = [0, COLUMN_SPAN];

export function pixelsPerMinute(interval: Interval): number {
  return SLOT_HEIGHT[interval] / interval;
}
