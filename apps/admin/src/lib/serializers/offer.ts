import type { Types } from "mongoose";
import type { AdminOffer } from "@/types/admin";
import type { OfferAccentColor } from "@store/db";

export interface OfferLean {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  description: string;
  discountLabel: string;
  badgeLabel: string;
  accentColor: OfferAccentColor;
  expiresAt?: Date | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toOfferResponse(doc: OfferLean): AdminOffer {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    discountLabel: doc.discountLabel,
    badgeLabel: doc.badgeLabel,
    accentColor: doc.accentColor,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : undefined,
    isActive: doc.isActive,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
