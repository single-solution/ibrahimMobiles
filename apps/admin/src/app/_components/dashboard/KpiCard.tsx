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
  return (
    <div
      title={hint || changeLabel || label}
      className={classNames(
        "lift flex h-full flex-col justify-center rounded-[var(--radius-lg)] border px-4 py-3",
        TONE_CONTAINER[tone],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          {label}
        </p>
        {icon && (
          <span
            className={classNames(
              "grid size-7 place-items-center rounded-[var(--radius-md)]",
              TONE_ICON_BADGE[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-[20px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)]">
            {value}
          </p>
          {typeof changePercent === "number" && (
            <p
              className={classNames(
                "mt-1.5 flex items-center gap-0.5 text-[11px] font-semibold",
                isPositive ? "text-[var(--color-accent-700)]" : "text-rose-600",
              )}
            >
              {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(changePercent)}%
            </p>
          )}
        </div>
        {spark && <div className="shrink-0 pb-0.5 opacity-90">{spark}</div>}
      </div>
    </div>
  );
}
