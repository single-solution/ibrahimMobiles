import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { classNames } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  changePercent?: number;
  changeLabel?: string;
  icon?: ReactNode;
  spark?: ReactNode;
}

export function KpiCard({ label, value, changePercent, changeLabel, icon, spark }: KpiCardProps) {
  const isPositive = (changePercent ?? 0) >= 0;
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 transition-shadow hover:shadow-[var(--shadow-sm)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)] sm:text-[11px]">
          {label}
        </p>
        {icon && (
          <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[var(--color-ink-600)] sm:size-9">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-4 text-[22px] font-semibold leading-none tracking-[-0.025em] text-[var(--color-ink-900)] sm:mt-6 sm:text-[30px]">
        {value}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3 sm:mt-5">
        {typeof changePercent === "number" ? (
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
        ) : (
          <span />
        )}
        {spark && <div className="ml-auto opacity-90">{spark}</div>}
      </div>
    </div>
  );
}
