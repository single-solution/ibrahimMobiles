import type { Types } from "mongoose";
import type { GradeAttributes, WithTimestamps } from "@store/db";
import {
  asString,
  normalizeStructuredContent,
  objectIdString,
  toIsoDate,
} from "@store/shared";
import type { AdminGrade } from "@/types/admin";

export type GradeLean = WithTimestamps<GradeAttributes> & {
  _id: Types.ObjectId;
};

export function toGradeResponse(grade: GradeLean): AdminGrade {
  return {
    id: objectIdString(grade._id),
    categorySlug: asString(grade.categorySlug),
    slug: asString(grade.slug),
    label: asString(grade.label),
    notes: asString(grade.notes),
    color: asString(grade.color, "#1f2937"),
    video: grade.video ?? "",
    content: normalizeStructuredContent(grade.content, asString(grade.notes)),
    createdAt: toIsoDate(grade.createdAt),
    updatedAt: toIsoDate(grade.updatedAt),
  };
}
