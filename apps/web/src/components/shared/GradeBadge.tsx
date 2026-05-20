"use client";

import { useGrade } from "@/lib/storefront/storefrontReferenceContext";

interface GradeBadgeProps {
  /** Owning category slug — `Variant.gradeSlug` is unique only within this scope. */
  categorySlug: string;
  /** The variant's grade slug. */
  gradeSlug: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-5 min-w-5 px-1.5 text-[10px]",
  md: "h-6 min-w-6 px-2 text-[11px]",
  lg: "h-7 min-w-7 px-2.5 text-xs",
} as const;

/**
 * Renders a coloured chip for the variant's grade, using the admin-authored
 * label + hex colour from the `Grade` collection. Falls back gracefully to
 * the raw slug when the descriptor can't be resolved (storybook, brief
 * pre-hydration window) — the badge stays readable even with no data.
 */
export function GradeBadge({
  categorySlug,
  gradeSlug,
  size = "md",
  className,
}: GradeBadgeProps) {
  const descriptor = useGrade(categorySlug, gradeSlug);
  const label = descriptor?.label ?? gradeSlug;
  const color = descriptor?.color ?? "#1f2937";

  const sizeClass = SIZE_CLASSES[size];
  const classes = [
    "inline-flex items-center justify-center rounded-[var(--radius-md)] font-bold uppercase tracking-tight leading-none text-white shadow-[var(--shadow-sm)]",
    sizeClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      style={{ backgroundColor: color }}
      aria-label={`Grade ${label}`}
    >
      {label}
    </span>
  );
}
