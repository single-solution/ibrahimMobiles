import type { GradeDescriptor } from "@/types";

export const gradeDescriptors: GradeDescriptor[] = [
  {
    grade: "A+",
    shortLabel: "Like New",
    description: "Indistinguishable from a brand-new device.",
    cosmeticNotes: "No marks, no scratches, original packaging when available.",
    functionalNotes: "Battery health 95%+. All accessories included.",
  },
  {
    grade: "A",
    shortLabel: "Excellent",
    description: "Only visible under direct light at the right angle.",
    cosmeticNotes: "Possible micro-scratch on the back; screen flawless.",
    functionalNotes: "Battery health 90%+. Generic charger included.",
  },
  {
    grade: "B",
    shortLabel: "Good",
    description: "Light scuffs you can spot in normal light.",
    cosmeticNotes: "Minor scuffs on frame or back. Screen clean.",
    functionalNotes: "Battery health 85%+. Fully functional.",
  },
  {
    grade: "C",
    shortLabel: "Fair",
    description: "Visible wear — perfect for the budget-conscious.",
    cosmeticNotes: "Visible scratches; possible small dent. No screen cracks.",
    functionalNotes: "Battery health 80%+. All features tested and working.",
  },
];

export function getGradeDescriptor(grade: GradeDescriptor["grade"]): GradeDescriptor {
  const match = gradeDescriptors.find((descriptor) => descriptor.grade === grade);
  if (!match) {
    throw new Error(`Unknown grade: ${grade}`);
  }
  return match;
}
