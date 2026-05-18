import type { ConditionGrade, GradeDescriptor } from "@store/shared";

/**
 * Canonical source for the label, copy, and tone color used by GradeBadge /
 * GradeShowcase and the shop filter sidebar. Order is best → worst, and is
 * also used as the sort rank and the display order in filters.
 */
export const gradeDescriptors: GradeDescriptor[] = [
  {
    grade: "brand-new",
    label: "Brand New",
    shortLabel: "Brand new",
    description:
      "Factory-sealed, unopened. Full international warranty where applicable. Highest grade we carry.",
    cosmeticNotes: "Pristine — original packaging, all seals intact, no marks.",
    functionalNotes: "Battery health 100%. All accessories included, untouched.",
    tone: "dark",
  },
  {
    grade: "genuine",
    label: "Genuine",
    shortLabel: "Genuine",
    description:
      "Authentic, original-spec device imported through legitimate channels. Most reliable used-stock category.",
    cosmeticNotes: "Light wear at most — no chassis damage, screen flawless or near-flawless.",
    functionalNotes: "Battery health 90%+. Genuine charging accessories included.",
    tone: "accent",
  },
  {
    grade: "box-open",
    label: "Box Open",
    shortLabel: "Box-open",
    description:
      "Sealed box opened for inspection or display only — never used. Comes with original accessories.",
    cosmeticNotes: "No marks, no scratches. Box may show light handling.",
    functionalNotes: "Battery health 99%+. All accessories included.",
    tone: "info",
  },
  {
    grade: "refurbished",
    label: "Refurbished",
    shortLabel: "Refurbished",
    description:
      "Professionally repaired or restored — battery and key parts replaced. Not factory-original throughout.",
    cosmeticNotes: "Restored body, replacement screen or back may differ slightly from original.",
    functionalNotes: "Battery health 85%+ (replaced). Warranty covers our service work.",
    tone: "neutral",
  },
  {
    grade: "china-water",
    label: "China Water Pack",
    shortLabel: "China-pack",
    description:
      "Chinese-region stock, often parallel-imported. Usually cheaper but mixed reliability — checked thoroughly before listing.",
    cosmeticNotes: "Cosmetics vary unit to unit. Each unit photographed before dispatch.",
    functionalNotes: "Battery health 80%+. Often non-PTA — check listing for status.",
    tone: "warn",
  },
  {
    grade: "lcd-shaded",
    label: "LCD Shaded",
    shortLabel: "LCD shaded",
    description:
      "Functional unit with visible screen tint, shadow or burn-in. Heavily discounted — best for budget buyers who don't mind a marked display.",
    cosmeticNotes: "Visible display defect (tint, shadow, dead spots, burn-in).",
    functionalNotes: "Battery health 80%+. All other features tested and working.",
    tone: "danger",
  },
];

const BY_GRADE: Record<ConditionGrade, GradeDescriptor> = gradeDescriptors.reduce(
  (acc, descriptor) => {
    acc[descriptor.grade] = descriptor;
    return acc;
  },
  {} as Record<ConditionGrade, GradeDescriptor>,
);

export function getGradeDescriptor(grade: ConditionGrade): GradeDescriptor {
  return BY_GRADE[grade];
}
