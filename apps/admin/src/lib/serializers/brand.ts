import type { Types } from "mongoose";
import type { BrandAttributes, WithTimestamps } from "@store/db";
import type { AdminBrand } from "@/types/admin";

export type BrandLean = WithTimestamps<BrandAttributes> & {
  _id: Types.ObjectId;
};

export function toBrandResponse(brand: BrandLean): AdminBrand {
  return {
    id: brand._id.toString(),
    slug: brand.slug,
    name: brand.name,
    categorySlugs: brand.categorySlugs ?? [],
    isActive: brand.isActive,
    sortOrder: brand.sortOrder ?? 0,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  };
}
