import type { Types } from "mongoose";
import type { OfferAttributes, WithTimestamps } from "@store/db";
import {
  asString,
  isStoredImage,
  normalizeStructuredContent,
  objectIdString,
  toIsoDate,
} from "@store/shared";
import type { AdminOffer } from "@/types/admin";

export type OfferLean = WithTimestamps<OfferAttributes> & {
  _id: Types.ObjectId;
};

export function toOfferResponse(doc: OfferLean): AdminOffer {
  return {
    id: objectIdString(doc._id),
    slug: asString(doc.slug),
    title: asString(doc.title),
    description: asString(doc.description),
    discountLabel: asString(doc.discountLabel),
    badgeLabel: asString(doc.badgeLabel),
    color: asString(doc.color, "#e1ff51"),
    bannerImage: isStoredImage(doc.bannerImage) ? doc.bannerImage : null,
    expiresAt: doc.expiresAt
      ? toIsoDate(doc.expiresAt)
      : undefined,
    isActive: doc.isActive ?? true,
    sortOrder: doc.sortOrder ?? 0,
    content: normalizeStructuredContent(doc.content, asString(doc.description)),
    seo: doc.seo,
    createdAt: toIsoDate(doc.createdAt),
    updatedAt: toIsoDate(doc.updatedAt),
  };
}
