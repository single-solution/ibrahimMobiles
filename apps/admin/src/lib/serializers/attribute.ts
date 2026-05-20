import type { Types } from "mongoose";
import type { AttributeAttributes, WithTimestamps } from "@store/db";
import type { AdminAttribute } from "@/types/admin";

export type AttributeLean = WithTimestamps<AttributeAttributes> & {
  _id: Types.ObjectId;
};

export function toAttributeResponse(attr: AttributeLean): AdminAttribute {
  return {
    id: attr._id.toString(),
    categorySlug: attr.categorySlug,
    slug: attr.slug,
    label: attr.label,
    options: (attr.options ?? []).map((o) => ({
      value: o.value,
      label: o.label,
    })),
    cardPosition: attr.cardPosition,
    isActive: attr.isActive,
    createdAt: attr.createdAt.toISOString(),
    updatedAt: attr.updatedAt.toISOString(),
  };
}
