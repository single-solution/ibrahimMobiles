"use client";

import type { ConditionGrade } from "@store/shared";
import { Badge } from "@/components/ui/Badge";
import { useGrade } from "@/lib/storefront/storefrontReferenceContext";

interface GradeBadgeProps {
  grade: ConditionGrade;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const GRADE_TONE_MAP = {
  "brand-new": "grade-brand-new",
  genuine: "grade-genuine",
  "box-open": "grade-box-open",
  refurbished: "grade-refurbished",
  "china-water": "grade-china-water",
  "lcd-shaded": "grade-lcd-shaded",
} as const;

/**
 * Fallback labels used when the descriptor for a grade can't be resolved
 * from the storefront reference context — e.g. during the brief window
 * before hydration on a CSR-only render. Keeps the badge readable instead
 * of showing the raw slug.
 */
const GRADE_FALLBACK_LABEL: Record<ConditionGrade, string> = {
  "brand-new": "Brand new",
  genuine: "Genuine",
  "box-open": "Box-open",
  refurbished: "Refurbished",
  "china-water": "China-pack",
  "lcd-shaded": "LCD shaded",
};

export function GradeBadge({ grade, size = "md", className }: GradeBadgeProps) {
  const descriptor = useGrade(grade);
  const shortLabel = descriptor?.shortLabel ?? GRADE_FALLBACK_LABEL[grade];
  const fullLabel = descriptor?.label ?? GRADE_FALLBACK_LABEL[grade];
  return (
    <Badge tone={GRADE_TONE_MAP[grade]} size={size} className={className}>
      <span aria-label={`Grade ${fullLabel}`}>{shortLabel}</span>
    </Badge>
  );
}
