import type { ConditionGrade } from "@store/shared";
import { Badge } from "@/components/ui/Badge";
import { getGradeDescriptor } from "@/data/grades";

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

export function GradeBadge({ grade, size = "md", className }: GradeBadgeProps) {
  const descriptor = getGradeDescriptor(grade);
  return (
    <Badge tone={GRADE_TONE_MAP[grade]} size={size} className={className}>
      <span aria-label={`Grade ${descriptor.label}`}>{descriptor.shortLabel}</span>
    </Badge>
  );
}
