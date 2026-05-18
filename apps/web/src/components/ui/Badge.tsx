import type { ReactNode } from "react";
import { classNames } from "@store/shared";

type BadgeTone =
  | "neutral"
  | "accent"
  | "warn"
  | "danger"
  | "info"
  | "dark"
  | "pak"
  | "grade-brand-new"
  | "grade-genuine"
  | "grade-box-open"
  | "grade-refurbished"
  | "grade-china-water"
  | "grade-lcd-shaded";

type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
  children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-[var(--color-ink-100)] text-[var(--color-ink-800)]",
  accent: "bg-[var(--color-accent-600)] text-white",
  warn: "bg-[var(--color-warn-500)] text-white",
  danger: "bg-[var(--color-danger-500)] text-white",
  info: "bg-[var(--color-info-500)] text-white",
  dark: "bg-[var(--color-ink-900)] text-white",
  pak: "bg-[var(--color-pak-green)] text-white",
  "grade-brand-new": "bg-[var(--color-grade-brand-new)] text-white",
  "grade-genuine": "bg-[var(--color-grade-genuine)] text-white",
  "grade-box-open": "bg-[var(--color-grade-box-open)] text-white",
  "grade-refurbished": "bg-[var(--color-grade-refurbished)] text-white",
  "grade-china-water": "bg-[var(--color-grade-china-water)] text-white",
  "grade-lcd-shaded": "bg-[var(--color-grade-lcd-shaded)] text-white",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "h-5 min-w-5 px-1.5 text-[10px]",
  md: "h-6 min-w-6 px-2 text-[11px]",
  lg: "h-7 min-w-7 px-2.5 text-xs",
};

export function Badge({ tone = "neutral", size = "md", className, children }: BadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] font-bold uppercase tracking-tight leading-none shadow-[var(--shadow-sm)]",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
