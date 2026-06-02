import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { classNames } from "@store/shared";

type KpiTone = "default" | "accent" | "info" | "warn" | "danger";

interface KpiCardProps {
  label: string;
  value: string;
  changePercent?: number;
  changeLabel?: string;
  icon?: ReactNode;
  spark?: ReactNode;
  hint?: string;
  tone?: KpiTone;
}

// Card bodies stay neutral so the dashboard reads calm — only the single
// accent (headline Sales) tints its surface. Semantic tones (info/warn/
// danger) survive solely as a muted icon-badge tint, enough to signal
// "needs attention" without painting the whole grid in colour.
const TONE_CONTAINER: Record<KpiTone, string> = {
  default: "border-[var(--color-ink-200)] bg-[var(--color-surface)]",
  accent: "border-[var(--color-accent-200)] bg-[var(--color-accent-50)]",
  info: "border-[var(--color-ink-200)] bg-[var(--color-surface)]",
  warn: "border-[var(--color-ink-200)] bg-[var(--color-surface)]",
  danger: "border-[var(--color-ink-200)] bg-[var(--color-surface)]",
};

const TONE_ICON_BADGE: Record<KpiTone, string> = {
  default: "bg-[var(--color-canvas-deep)] text-[var(--color-ink-700)]",
  accent: "bg-[var(--color-accent-500)] text-[var(--color-ink-900)]",
  info: "bg-sky-500/10 text-sky-600",
  warn: "bg-amber-500/12 text-amber-700",
  danger: "bg-rose-500/12 text-rose-600",
};

export function KpiCard({
  label,
  value,
  changePercent,
  changeLabel,
  icon,
  spark,
  hint,
  tone = "default",
}: KpiCardProps) {
  const isPositive = (changePercent ?? 0) >= 0;
  // Compact two-row layout — was three stacked rows (label+icon, value,
  // trend) totalling ~110px tall. Now: icon sits on the left of the value
  // line, label sits above as a tight eyebrow, change% rides next to the
  // value. Trend row only renders when there's actually data to show, so
  // pure-info cards (e.g. "Days with orders") collapse from three rows to
  // two without an empty footer eating space. Result: ~70px per card.
  return (
    <div
      title={hint || label}
      className={classNames(
        /* Concentric: inner icon badge --radius-md (8) + px-3 (12) →
           outer 20 = --radius-xl. */
        "lift flex h-full flex-col justify-center rounded-[var(--radius-xl)] border px-3 py-2.5 sm:px-3.5 sm:py-3",
        TONE_CONTAINER[tone],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)] sm:text-[10.5px]">
          {label}
        </p>
        {icon && (
          <span
            className={classNames(
              "grid size-6 place-items-center rounded-[var(--radius-md)] sm:size-7",
              TONE_ICON_BADGE[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2 sm:mt-2">
        <p className="text-[17px] font-semibold leading-none tracking-[-0.02em] text-[var(--color-ink-900)] sm:text-[20px]">
          {value}
        </p>
        {typeof changePercent === "number" && (
          <span
            className={classNames(
              "inline-flex shrink-0 items-center gap-0.5 text-[10.5px] font-semibold sm:text-[11px]",
              isPositive ? "text-[var(--color-accent-700)]" : "text-rose-600",
            )}
          >
            {isPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(changePercent)}%
          </span>
        )}
      </div>
      {(changeLabel || hint || spark) && (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-[10.5px] text-[var(--color-ink-500)]">
            {hint ?? changeLabel}
          </span>
          {spark && <div className="ml-auto shrink-0 opacity-90">{spark}</div>}
        </div>
      )}
    </div>
  );
}
