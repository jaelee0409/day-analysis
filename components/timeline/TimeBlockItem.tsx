"use client";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { category } from "@/lib/categories";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { formatDuration } from "@/lib/time";
import type { TimeBlock } from "@/types/time";

export type BlockLayout = {
  top: number;
  height: number;
  /** The block's whole duration, even when this piece of it is clipped. */
  minutes: number;
  startLabel: string;
  endLabel: string;
};

/**
 * One recorded activity, laid against the ruler at true scale. Below roughly
 * forty pixels there is only room for one line, so the block drops its time
 * range rather than crushing the type.
 *
 * A block crossing the midpoint of the day is drawn as two pieces, one in each
 * half. The clipped edge loses its rounding and its resize handle, so the seam
 * reads as a continuation rather than an end.
 */
export function TimeBlockItem({
  block,
  layout,
  continuesAbove = false,
  continuesBelow = false,
  onOpen,
  onResizeStart,
}: {
  block: TimeBlock;
  layout: BlockLayout;
  continuesAbove?: boolean;
  continuesBelow?: boolean;
  onOpen: (block: TimeBlock) => void;
  onResizeStart: (block: TimeBlock, edge: "start" | "end") => void;
}) {
  const { locale, t } = useLocale();
  const meta = category(block.category);
  const compact = layout.height < 40;
  const title = block.title?.trim() || t(`category.${block.category}.label` as MessageKey);

  const edges = [
    continuesAbove ? "rounded-t-none border-t-0" : "rounded-t-lg",
    continuesBelow ? "rounded-b-none border-b-0" : "rounded-b-lg",
  ].join(" ");

  return (
    <div
      className={`activity pointer-events-auto absolute overflow-hidden ${edges}`}
      style={
        {
          top: layout.top,
          height: Math.max(layout.height, 20),
          left: 0,
          right: 0,
          "--mark": meta.color,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        onClick={() => onOpen(block)}
        className={`flex h-full w-full flex-col gap-0.5 px-2.5 text-left ${
          compact ? "justify-center" : "justify-start pt-1.5"
        }`}
        aria-label={`${title}, ${layout.startLabel}–${layout.endLabel}, ${formatDuration(layout.minutes, locale)}`}
      >
        <span className={`flex min-w-0 items-center gap-1.5 ${compact ? "" : "mb-px"}`}>
          <span className="shrink-0" style={{ color: meta.color }}>
            <CategoryIcon id={block.category} size={13} />
          </span>
          <span className="truncate text-[13px] font-medium leading-tight text-ink">{title}</span>
          {compact ? (
            <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted">
              {formatDuration(layout.minutes, locale)}
            </span>
          ) : null}
        </span>
        {compact ? null : (
          <span className="flex items-center gap-2 pl-[18px] text-[11.5px] tabular-nums text-muted">
            <span>
              {layout.startLabel} – {layout.endLabel}
            </span>
            <span className="text-faint">{formatDuration(layout.minutes, locale)}</span>
          </span>
        )}
      </button>

      {continuesAbove ? null : (
        <span
          className="activity-handle absolute inset-x-0 top-0 h-[7px] cursor-ns-resize"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onResizeStart(block, "start");
          }}
        >
          <span className="absolute left-1/2 top-[2px] h-[2px] w-7 -translate-x-1/2 rounded-full bg-[#15171a]/25" />
        </span>
      )}

      {continuesBelow ? null : (
        <span
          className="activity-handle absolute inset-x-0 bottom-0 h-[7px] cursor-ns-resize"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onResizeStart(block, "end");
          }}
        >
          <span className="absolute bottom-[2px] left-1/2 h-[2px] w-7 -translate-x-1/2 rounded-full bg-[#15171a]/25" />
        </span>
      )}
    </div>
  );
}
