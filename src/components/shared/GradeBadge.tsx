import type { ConditionGrade } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Pill } from "@/components/ui/Pill";
import { classNames } from "@/lib/utils";

interface GradeBadgeProps {
  grade: ConditionGrade;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const GRADE_TONE: Record<ConditionGrade, "grade-aplus" | "grade-a" | "grade-b" | "grade-c"> = {
  "A+": "grade-aplus",
  A: "grade-a",
  B: "grade-b",
  C: "grade-c",
};

const GRADE_LABELS: Record<ConditionGrade, string> = {
  "A+": "Like New",
  A: "Excellent",
  B: "Good",
  C: "Fair",
};

export function GradeBadge({ grade, size = "md", showLabel = false, className }: GradeBadgeProps) {
  const ariaLabel = `Condition grade ${grade} — ${GRADE_LABELS[grade]}`;

  if (showLabel) {
    return (
      <Pill
        tone="neutral"
        size={size === "lg" ? "md" : "sm"}
        className={classNames("!gap-2 !pl-1", className)}
        leadingIcon={
          <Badge tone={GRADE_TONE[grade]} size={size === "lg" ? "md" : "sm"}>
            {grade}
          </Badge>
        }
      >
        {GRADE_LABELS[grade]}
      </Pill>
    );
  }

  return (
    <Badge
      tone={GRADE_TONE[grade]}
      size={size}
      className={className}
    >
      <span aria-label={ariaLabel}>{grade}</span>
    </Badge>
  );
}
