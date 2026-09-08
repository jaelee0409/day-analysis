"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityModal, type ModalTarget } from "@/components/timeline/ActivityModal";
import { COLUMNS, COLUMN_SPAN, GUTTER, pixelsPerMinute } from "@/components/timeline/metrics";
import { TimeBlockItem } from "@/components/timeline/TimeBlockItem";
import { TimeGrid } from "@/components/timeline/TimeGrid";
import { useLocale } from "@/lib/locale-context";
import { MINUTES_PER_DAY, blockRange, buildSlots, formatDuration, offsetToClock, snap } from "@/lib/time";
import type { ActivityCategory, Interval, NewTimeBlock, TimeBlock } from "@/types/time";

type ResizeState = {
  block: TimeBlock;
  edge: "start" | "end";
  column: number;
  start: number;
  end: number;
};

export type TimelineProps = {
  date: string;
  blocks: TimeBlock[];
  interval: Interval;
  dayStart: number;
  categories: ActivityCategory[];
  /** Minutes into the window, or null when this is not the day in progress. */
  nowOffset: number | null;
  onCreate: (input: NewTimeBlock) => Promise<void> | void;
  onUpdate: (id: string, patch: Partial<NewTimeBlock>) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  /** Opens the recorder from outside — the keyboard shortcut on Today. */
  openAt?: { start: number; end: number; token: number } | null;
  /** Scrolls the page to the current time when the day first loads. */
  focusOnLoad?: boolean;
};

/**
 * The day is cut at its midpoint and the halves stand side by side, so a full
 * 24 hours reads at a glance instead of unrolling into a marathon scroll.
 */
export function Timeline({
  date,
  blocks,
  interval,
  dayStart,
  categories,
  nowOffset,
  onCreate,
  onUpdate,
  onDelete,
  openAt,
  focusOnLoad = false,
}: TimelineProps) {
  const { locale, t } = useLocale();
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragOriginRef = useRef<{
    column: number;
    offset: number;
    clientY: number;
    touch: boolean;
  } | null>(null);
  const anchoredRef = useRef<string>("");

  const [draft, setDraft] = useState<{ column: number; start: number; end: number } | null>(null);
  const [hover, setHover] = useState<{ column: number; offset: number } | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [target, setTarget] = useState<ModalTarget | null>(null);

  const ppm = pixelsPerMinute(interval);
  const columnHeight = COLUMN_SPAN * ppm;
  const slots = useMemo(() => buildSlots(dayStart, interval), [dayStart, interval]);

  /* ---------------- pointer geometry ---------------- */

  /** Where the cursor sits on the day, held inside the half it started in. */
  const offsetAt = useCallback(
    (clientY: number, column: number) => {
      const base = COLUMNS[column];
      const rect = trackRefs.current[column]?.getBoundingClientRect();
      if (!rect) return base;
      const local = (clientY - rect.top) / ppm;
      return Math.max(base, Math.min(base + COLUMN_SPAN, base + local));
    },
    [ppm],
  );

  /* ---------------- create by click or drag ---------------- */

  /**
   * A finger cannot sweep a range and scroll the page with the same gesture,
   * and scrolling is what a finger is nearly always doing. So touch only ever
   * taps: press and release without travelling opens the recorder on that one
   * slot, and anything longer belongs to the browser as a scroll.
   */
  const beginDraft = (event: React.PointerEvent<HTMLDivElement>, column: number) => {
    if (event.button !== 0) return;
    const touch = event.pointerType !== "mouse";
    const origin = snap(offsetAt(event.clientY, column), interval);
    dragOriginRef.current = { column, offset: origin, clientY: event.clientY, touch };

    if (touch) return; // No preview, and no capture: the page must stay scrollable.

    setDraft({ column, start: origin, end: Math.min(origin + interval, COLUMNS[column] + COLUMN_SPAN) });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const extendDraft = (event: React.PointerEvent<HTMLDivElement>, column: number) => {
    const origin = dragOriginRef.current;
    if (!origin) {
      if (event.pointerType === "mouse") {
        setHover({ column, offset: snap(offsetAt(event.clientY, column), interval) });
      }
      return;
    }
    if (origin.touch) return;
    const cursor = snap(offsetAt(event.clientY, origin.column), interval);
    setDraft({
      column: origin.column,
      start: Math.min(origin.offset, cursor),
      end: Math.min(Math.max(origin.offset, cursor) + interval, COLUMNS[origin.column] + COLUMN_SPAN),
    });
  };

  /** Travel beyond this on touch is a scroll, not a recording. */
  const TAP_SLOP = 10;

  const commitDraft = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current;
    dragOriginRef.current = null;
    if (!origin) return;

    if (origin.touch) {
      setDraft(null);
      if (Math.abs(event.clientY - origin.clientY) > TAP_SLOP) return;
      setTarget({
        mode: "create",
        start: origin.offset,
        end: Math.min(origin.offset + interval, COLUMNS[origin.column] + COLUMN_SPAN),
      });
      return;
    }

    setDraft((current) => {
      if (current) setTarget({ mode: "create", start: current.start, end: current.end });
      return null;
    });
  };

  /** The browser taking over to scroll. Abandon the gesture rather than record it. */
  const abandonDraft = () => {
    dragOriginRef.current = null;
    setDraft(null);
    setHover(null);
  };

  /* ---------------- resize ---------------- */

  const startResize = useCallback(
    (block: TimeBlock, edge: "start" | "end", column: number) => {
      const range = blockRange(block, dayStart);
      setResize({ block, edge, column, start: range.start, end: range.end });
    },
    [dayStart],
  );

  useEffect(() => {
    if (!resize) return;

    const onMove = (event: PointerEvent) => {
      const cursor = snap(offsetAt(event.clientY, resize.column), interval);
      setResize((current) => {
        if (!current) return current;
        if (current.edge === "start") {
          return { ...current, start: Math.min(cursor, current.end - interval) };
        }
        return { ...current, end: Math.max(cursor + interval, current.start + interval) };
      });
    };

    const onUp = () => {
      setResize((current) => {
        if (current) {
          void onUpdate(current.block.id, {
            startTime: offsetToClock(current.start, dayStart),
            endTime: offsetToClock(current.end, dayStart),
          });
        }
        return null;
      });
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [resize, interval, dayStart, offsetAt, onUpdate]);

  /* ---------------- open from outside ---------------- */

  useEffect(() => {
    if (!openAt) return;
    setTarget({ mode: "create", start: openAt.start, end: openAt.end });
  }, [openAt]);

  /* ---------------- open the page at the current time ---------------- */

  useLayoutEffect(() => {
    if (!focusOnLoad) return;

    // Anchor once per day and resolution. Re-anchoring on every tick would
    // yank the page out from under someone who has scrolled away, but the
    // first paint often lands before the blocks have loaded, so wait for
    // something worth scrolling to.
    const token = `${date}:${interval}`;
    if (anchoredRef.current === token) return;
    if (nowOffset === null && blocks.length === 0) return;

    const anchor = nowOffset ?? blockRange(blocks[0], dayStart).start;
    const column = anchor >= COLUMN_SPAN ? 1 : 0;
    const track = trackRefs.current[column];
    if (!track) return;

    anchoredRef.current = token;
    const anchorTop = track.getBoundingClientRect().top + window.scrollY + (anchor - COLUMNS[column]) * ppm;

    // Now that the day fits in two halves it is often already on screen, and
    // scrolling anyway would hide the header for no gain.
    if (anchorTop - window.scrollY < window.innerHeight * 0.7) return;
    window.scrollTo({ top: Math.max(0, anchorTop - window.innerHeight / 3) });
  }, [date, interval, blocks, nowOffset, dayStart, ppm, focusOnLoad]);

  /* ---------------- layout ---------------- */

  /**
   * A block crossing the midpoint is drawn once in each half. Both pieces
   * carry the block's real start, end and duration — the drawing is cut, never
   * the measurement.
   */
  const segments = useMemo(() => {
    return blocks.flatMap((block) => {
      const range = resize?.block.id === block.id ? resize : blockRange(block, dayStart);
      const minutes = range.end - range.start;
      if (minutes <= 0) return [];

      return COLUMNS.flatMap((base, column) => {
        const top = Math.max(range.start, base);
        const bottom = Math.min(range.end, base + COLUMN_SPAN);
        if (bottom <= top) return [];
        return [
          {
            key: `${block.id}-${column}`,
            block,
            column,
            continuesAbove: range.start < base,
            continuesBelow: range.end > base + COLUMN_SPAN,
            layout: {
              top: (top - base) * ppm,
              height: (bottom - top) * ppm,
              minutes,
              startLabel: offsetToClock(range.start, dayStart),
              endLabel: offsetToClock(range.end, dayStart),
            },
          },
        ];
      });
    });
  }, [blocks, resize, dayStart, ppm]);

  /** How much of each half is accounted for, read straight off the blocks. */
  const trackedPerColumn = useMemo(() => {
    const totals = [0, 0];
    for (const block of blocks) {
      const range = blockRange(block, dayStart);
      COLUMNS.forEach((base, column) => {
        const top = Math.max(range.start, base);
        const bottom = Math.min(range.end, base + COLUMN_SPAN);
        if (bottom > top) totals[column] += bottom - top;
      });
    }
    return totals;
  }, [blocks, dayStart]);

  const band =
    draft ?? (hover && !resize ? { column: hover.column, start: hover.offset, end: hover.offset + interval } : null);

  return (
    <>
      <div className="@container">
        <div className="grid overflow-hidden rounded-xl border border-line @min-[620px]:grid-cols-2">
          {COLUMNS.map((base, column) => {
            const columnSlots = slots.filter((slot) => slot.offset >= base && slot.offset < base + COLUMN_SPAN);
            const endOffset = base + COLUMN_SPAN;
            const bandHere = band && band.column === column ? band : null;

            return (
              <div
                key={base}
                className={`${column === 1 ? "bg-track-late border-t border-line @min-[620px]:border-l @min-[620px]:border-t-0" : "bg-track-early"}`}
              >
                <div className="flex items-baseline justify-between gap-3 border-b border-hairline px-3 py-2">
                  <span className="text-[12px] font-medium tabular-nums text-ink-soft">
                    {offsetToClock(base, dayStart)} – {boundaryLabel(endOffset, dayStart)}
                  </span>
                  <span className="text-[11.5px] tabular-nums text-faint">
                    {trackedPerColumn[column] > 0
                      ? t("timeline.trackedIn", { duration: formatDuration(trackedPerColumn[column], locale) })
                      : t("timeline.nothingYet")}
                  </span>
                </div>

                <div className="relative py-3 pr-3">
                  <div
                    ref={(el) => {
                      trackRefs.current[column] = el;
                    }}
                    className="relative"
                    style={{ height: columnHeight }}
                  >
                    <TimeGrid
                      slots={columnSlots}
                      interval={interval}
                      base={base}
                      endLabel={boundaryLabel(endOffset, dayStart)}
                    />

                    {/* Capture layer for click-and-drag recording. Sits under the blocks. */}
                    <div
                      className="absolute inset-y-0 right-0 cursor-crosshair"
                      // Set outright rather than through a utility: Tailwind
                      // composes touch-action from custom properties, and this
                      // decides whether a finger can scroll the page at all.
                      style={{ left: GUTTER, touchAction: "pan-y" }}
                      onPointerDown={(event) => beginDraft(event, column)}
                      onPointerMove={(event) => extendDraft(event, column)}
                      onPointerUp={commitDraft}
                      onPointerCancel={abandonDraft}
                      onPointerLeave={() => setHover(null)}
                    />

                    {bandHere ? (
                      <div
                        className="pointer-events-none absolute rounded-lg border border-dashed border-[#b9bfbf] bg-[#15171a]/[0.035]"
                        style={{
                          top: (bandHere.start - base) * ppm,
                          height: Math.max((bandHere.end - bandHere.start) * ppm, 18),
                          left: GUTTER + 8,
                          right: 8,
                        }}
                      >
                        {draft ? (
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11.5px] font-medium tabular-nums text-ink-soft">
                            {offsetToClock(bandHere.start, dayStart)} – {offsetToClock(bandHere.end, dayStart)}
                            <span className="ml-2 text-faint">
                              {formatDuration(bandHere.end - bandHere.start, locale)}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="pointer-events-none absolute inset-y-0" style={{ left: GUTTER + 8, right: 8 }}>
                      {segments
                        .filter((segment) => segment.column === column)
                        .map((segment) => (
                          <TimeBlockItem
                            key={segment.key}
                            block={segment.block}
                            layout={segment.layout}
                            continuesAbove={segment.continuesAbove}
                            continuesBelow={segment.continuesBelow}
                            onOpen={(b) => setTarget({ mode: "edit", block: b })}
                            onResizeStart={(b, edge) => startResize(b, edge, column)}
                          />
                        ))}
                    </div>

                    {nowOffset !== null && nowOffset >= base && nowOffset < endOffset ? (
                      <NowLine offset={nowOffset - base} clock={offsetToClock(nowOffset, dayStart)} ppm={ppm} />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ActivityModal
        target={target}
        date={date}
        interval={interval}
        dayStart={dayStart}
        categories={categories}
        onClose={() => setTarget(null)}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </>
  );
}

/** The end of the day reads as 24:00 rather than looping back to 00:00. */
function boundaryLabel(offset: number, dayStart: number): string {
  if (offset >= MINUTES_PER_DAY && dayStart === 0) return "24:00";
  return offsetToClock(offset, dayStart);
}

/** The only red on the page: the one thing that is actually happening. */
function NowLine({ offset, clock, ppm }: { offset: number; clock: string; ppm: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: offset * ppm }} aria-hidden="true">
      <div className="absolute inset-x-0 top-0 h-px bg-signal/70" style={{ left: GUTTER }} />
      <div className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-signal" style={{ left: GUTTER - 3 }} />
      <div
        className="absolute -top-[9px] rounded-[4px] bg-signal px-1.5 py-[2px] text-[10.5px] font-semibold tabular-nums leading-[14px] text-white"
        style={{ left: 6 }}
      >
        {clock}
      </div>
    </div>
  );
}
