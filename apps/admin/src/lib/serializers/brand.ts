import type { Types } from "mongoose";
import type { BrandAttributes } from "@store/db";
import type { AdminBrand } from "@/types/admin";

export type BrandLean = BrandAttributes & { _id: Types.ObjectId };

export function toBrandResponse(brand: BrandLean): AdminBrand {
  return {
    id: brand._id.toString(),
    slug: brand.slug,
    name: brand.name,
    tagline: brand.tagline,
    isActive: brand.isActive,
    sortOrder: brand.sortOrder ?? 0,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  };
}
