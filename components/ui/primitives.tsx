"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 * Button
 * ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-ink text-white hover:bg-[#25282c] disabled:bg-[#c3c8c8]",
  secondary: "border border-line bg-surface text-ink-soft hover:border-[#cfd4d4] hover:text-ink",
  ghost: "text-muted hover:bg-[#eceeee] hover:text-ink",
  danger: "border border-[#f0cfcc] bg-white text-signal hover:bg-[#fdf3f2]",
};

export function Button({ variant = "secondary", size = "md", className = "", ...props }: ButtonProps) {
  const sizing = size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[14px]";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizing} ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Card
 * ------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
  tone = "quiet",
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  /** "lead" is the one filled panel a page is allowed. See design.md. */
  tone?: "quiet" | "lead";
  as?: "section" | "div" | "article";
}) {
  return <Tag className={`${tone === "lead" ? "card-lead" : "card"} ${className}`}>{children}</Tag>;
}

/** A quiet heading for a panel. Sentence case, no eyebrow, no rule above it. */
export function PanelTitle({
  children,
  aside,
  onInk = false,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  onInk?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className={`text-[13.5px] font-semibold tracking-[-0.01em] ${onInk ? "text-white" : "text-ink"}`}>
        {children}
      </h2>
      {aside ? (
        <span className={`text-[12.5px] tabular-nums ${onInk ? "text-white/45" : "text-faint"}`}>{aside}</span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Segmented control
 * ------------------------------------------------------------------ */

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-line bg-[#f0f2f2] p-[3px]"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium tabular-nums transition-colors ${
              active ? "bg-surface text-ink shadow-[0_1px_2px_rgba(21,23,26,0.08)]" : "text-muted hover:text-ink-soft"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Modal
 * ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Dismiss on press, not click. A tap that opens this modal is followed by
          a compatibility click carrying pointerType "touch", which lands on the
          backdrop that has just appeared under the finger and closes it again
          before it can be seen. A press has no such echo. */}
      <div
        className="veil-in absolute inset-0 bg-[#15171a]/25"
        onPointerDown={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="sheet-in relative w-full max-w-[420px] rounded-t-2xl bg-surface shadow-[var(--shadow-float)] sm:rounded-2xl"
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Data marks
 * ------------------------------------------------------------------ */

/** One row of a horizontal breakdown: label, proportional bar, measured value. */
export function BarRow({
  label,
  icon,
  color,
  minutesLabel,
  fraction,
  meta,
}: {
  label: string;
  icon?: React.ReactNode;
  color: string;
  minutesLabel: string;
  fraction: number;
  meta?: string;
}) {
  return (
    <div className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-[7px]">
      <div className="flex min-w-0 items-center gap-2">
        {icon ? (
          <span className="shrink-0" style={{ color }}>
            {icon}
          </span>
        ) : null}
        <span className="truncate text-[13.5px] text-ink-soft">{label}</span>
        {meta ? <span className="shrink-0 text-[12px] tabular-nums text-faint">{meta}</span> : null}
      </div>
      <span className="text-[13.5px] font-medium tabular-nums text-ink">{minutesLabel}</span>
      <div className="col-span-2 h-[5px] overflow-hidden rounded-full bg-[#eff1f1]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(fraction * 100, 1.5)}%`, background: color }}
        />
      </div>
    </div>
  );
}

/** A measured value with its name underneath. The number leads. */
export function Stat({
  value,
  label,
  tone = "ink",
  size = "md",
}: {
  value: string;
  label: string;
  tone?: "ink" | "muted" | "signal" | "inverse" | "inverse-muted";
  size?: "sm" | "md" | "lg";
}) {
  const tones = {
    ink: "text-ink",
    muted: "text-faint",
    signal: "text-signal",
    inverse: "text-white",
    "inverse-muted": "text-white/45",
  }[tone];
  const sizes = {
    sm: "text-[20px] font-medium",
    md: "text-[30px] font-medium",
    lg: "text-[44px] font-normal",
  }[size];
  return (
    <div>
      <div className={`figure ${sizes} ${tones}`}>{value}</div>
      <div className={`mt-1.5 text-[12.5px] ${tone.startsWith("inverse") ? "text-white/50" : "text-muted"}`}>
        {label}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line px-6 py-10">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-muted">{body}</p>
      {action}
    </div>
  );
}
