import type { Types } from "mongoose";
import type { GradeAttributes } from "@store/db";
import type { AdminGrade } from "@/types/admin";

export type GradeLean = GradeAttributes & { _id: Types.ObjectId };

export function toGradeResponse(grade: GradeLean): AdminGrade {
  return {
    id: grade._id.toString(),
    grade: grade.grade,
    label: grade.label,
    shortLabel: grade.shortLabel,
    description: grade.description,
    cosmeticNotes: grade.cosmeticNotes,
    functionalNotes: grade.functionalNotes,
    tone: grade.tone,
    sortOrder: grade.sortOrder ?? 0,
    createdAt: grade.createdAt.toISOString(),
    updatedAt: grade.updatedAt.toISOString(),
  };
}
