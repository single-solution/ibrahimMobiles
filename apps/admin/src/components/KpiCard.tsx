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

const TONE_CONTAINER: Record<KpiTone, string> = {
  default:
    "border-[var(--color-ink-200)] bg-[var(--color-surface)]",
  accent:
    "border-[var(--color-accent-200)] bg-[var(--color-accent-50)]",
  info: "border-sky-200 bg-sky-50/60",
  warn: "border-amber-200 bg-amber-50/60",
  danger: "border-rose-200 bg-rose-50/60",
};

const TONE_ICON_BADGE: Record<KpiTone, string> = {
  default: "bg-[var(--color-canvas-deep)] text-[var(--color-ink-700)]",
  accent: "bg-[var(--color-accent-500)] text-[var(--color-ink-900)]",
  info: "bg-sky-500/15 text-sky-700",
  warn: "bg-amber-500/15 text-amber-800",
  danger: "bg-rose-500/15 text-rose-700",
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
  return (
    <div
      className={classNames(
        "lift rounded-[var(--radius-lg)] border p-4 sm:p-5",
        TONE_CONTAINER[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)] sm:text-[11px]">
          {label}
        </p>
        {icon && (
          <span
            className={classNames(
              "grid size-8 place-items-center rounded-[var(--radius-md)] sm:size-9",
              TONE_ICON_BADGE[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-4 text-[22px] font-semibold leading-none tracking-[-0.025em] text-[var(--color-ink-900)] sm:mt-5 sm:text-[28px]">
        {value}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3 sm:mt-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {typeof changePercent === "number" && (
            <span
              className={classNames(
                "inline-flex items-center gap-1 text-[11px] font-semibold sm:text-xs",
                isPositive ? "text-[var(--color-accent-700)]" : "text-rose-600",
              )}
            >
              {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(changePercent)}%
              {changeLabel && (
                <span className="hidden font-normal text-[var(--color-ink-500)] sm:inline">{changeLabel}</span>
              )}
            </span>
          )}
          {hint && (
            <span className="text-[11px] text-[var(--color-ink-500)]">{hint}</span>
          )}
        </div>
        {spark && <div className="ml-auto opacity-90">{spark}</div>}
      </div>
    </div>
  );
}
