import type { Types } from "mongoose";
import type { OfferAttributes, WithTimestamps } from "@store/db";
import type { AdminOffer } from "@/types/admin";

export type OfferLean = WithTimestamps<OfferAttributes> & {
  _id: Types.ObjectId;
};

export function toOfferResponse(doc: OfferLean): AdminOffer {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    discountLabel: doc.discountLabel,
    badgeLabel: doc.badgeLabel,
    color: doc.color,
    bannerImage: doc.bannerImage ?? null,
    expiresAt: doc.expiresAt
      ? new Date(doc.expiresAt).toISOString()
      : undefined,
    isActive: doc.isActive,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
