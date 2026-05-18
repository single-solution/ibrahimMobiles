import type { Types } from "mongoose";
import type { CategoryAttributes } from "@store/db";
import type { AdminCategory } from "@/types/admin";

export type CategoryLean = CategoryAttributes & { _id: Types.ObjectId };

export function toCategoryResponse(category: CategoryLean): AdminCategory {
  return {
    id: category._id.toString(),
    categoryId: category.categoryId,
    label: category.label,
    pluralLabel: category.pluralLabel,
    pathSegment: category.pathSegment,
    isActive: category.isActive,
    tagline: category.tagline,
    applicableGrades: category.applicableGrades ?? [],
    trustChips: category.trustChips ?? [],
    emptyHint: category.emptyHint,
    sortOrder: category.sortOrder ?? 0,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
