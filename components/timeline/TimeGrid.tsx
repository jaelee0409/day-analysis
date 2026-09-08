"use client";

import { COLUMN_SPAN, GUTTER, pixelsPerMinute } from "@/components/timeline/metrics";
import type { Slot } from "@/lib/time";
import type { Interval } from "@/types/time";

/**
 * The ruler itself.
 *
 * Tick weight carries the information: an hour gets a full rule across the
 * track and a solid label, a sub-interval gets a short tick in the gutter and
 * a whisper of a line. Nothing here is interactive.
 *
 * @param base Minutes into the day window where this half begins.
 * @param endLabel Clock reading for the closing edge, so each half is bounded
 *   at both ends rather than trailing off.
 */
export function TimeGrid({
  slots,
  interval,
  base,
  endLabel,
}: {
  slots: Slot[];
  interval: Interval;
  base: number;
  endLabel: string;
}) {
  const ppm = pixelsPerMinute(interval);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {slots.map((slot) => {
        const top = (slot.offset - base) * ppm;

        if (slot.isHour) {
          return (
            <div key={slot.offset} className="absolute inset-x-0" style={{ top }}>
              <div className="absolute inset-x-0 top-0 border-t border-line" style={{ left: GUTTER - 14 }} />
              <div
                className="absolute -top-[8px] text-[12px] font-medium tabular-nums text-ink-soft"
                style={{ left: 0, width: GUTTER - 20, textAlign: "right" }}
              >
                {slot.clock}
              </div>
            </div>
          );
        }

        return (
          <div key={slot.offset} className="absolute inset-x-0" style={{ top }}>
            <div className="absolute inset-x-0 top-0 border-t border-[#f4f6f6]" style={{ left: GUTTER }} />
            <div className="absolute top-0 border-t border-[#dfe3e3]" style={{ left: GUTTER - 8, width: 8 }} />
            <div
              className="absolute -top-[7px] text-[10.5px] tabular-nums text-faint"
              style={{ left: 0, width: GUTTER - 20, textAlign: "right" }}
            >
              {slot.clock}
            </div>
          </div>
        );
      })}

      <div className="absolute inset-x-0" style={{ top: COLUMN_SPAN * ppm }}>
        <div className="absolute inset-x-0 top-0 border-t border-line" style={{ left: GUTTER - 14 }} />
        <div
          className="absolute -top-[8px] text-[12px] font-medium tabular-nums text-ink-soft"
          style={{ left: 0, width: GUTTER - 20, textAlign: "right" }}
        >
          {endLabel}
        </div>
      </div>
    </div>
  );
}
