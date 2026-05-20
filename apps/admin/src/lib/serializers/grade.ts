import type { Types } from "mongoose";
import type { GradeAttributes, WithTimestamps } from "@store/db";
import type { AdminGrade } from "@/types/admin";

export type GradeLean = WithTimestamps<GradeAttributes> & {
  _id: Types.ObjectId;
};

export function toGradeResponse(grade: GradeLean): AdminGrade {
  return {
    id: grade._id.toString(),
    categorySlug: grade.categorySlug,
    slug: grade.slug,
    label: grade.label,
    notes: grade.notes,
    color: grade.color,
    video: grade.video,
    createdAt: grade.createdAt.toISOString(),
    updatedAt: grade.updatedAt.toISOString(),
  };
}
