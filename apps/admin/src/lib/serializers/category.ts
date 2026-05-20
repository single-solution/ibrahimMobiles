import type { Types } from "mongoose";
import type { CategoryAttributes, WithTimestamps } from "@store/db";
import type { AdminCategory } from "@/types/admin";

export type CategoryLean = WithTimestamps<CategoryAttributes> & {
  _id: Types.ObjectId;
};

export function toCategoryResponse(category: CategoryLean): AdminCategory {
  return {
    id: category._id.toString(),
    slug: category.slug,
    label: category.label,
    description: category.description,
    iconKind: category.iconKind,
    iconEmoji: category.iconEmoji,
    iconImage: category.iconImage,
    isActive: category.isActive,
    sortOrder: category.sortOrder ?? 0,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
