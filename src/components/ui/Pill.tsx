import type { ReactNode } from "react";
import { classNames } from "@/lib/utils";

type PillTone = "neutral" | "accent" | "warn" | "danger" | "info" | "dark" | "outline";
type PillSize = "sm" | "md";

interface PillProps {
  tone?: PillTone;
  size?: PillSize;
  leadingIcon?: ReactNode;
  className?: string;
  children: ReactNode;
}

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: "bg-[var(--color-ink-100)] text-[var(--color-ink-800)]",
  accent: "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800",
  dark: "bg-[var(--color-ink-900)] text-white shadow-[var(--shadow-sm)]",
  outline: "border border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)]",
};

const SIZE_CLASSES: Record<PillSize, string> = {
  sm: "h-6 px-2.5 text-[11px] gap-1",
  md: "h-7 px-3 text-xs gap-1.5",
};

export function Pill({ tone = "neutral", size = "md", leadingIcon, className, children }: PillProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-[var(--radius-full)] font-medium tracking-tight leading-none whitespace-nowrap",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className,
      )}
    >
      {leadingIcon}
      <span>{children}</span>
    </span>
  );
}
