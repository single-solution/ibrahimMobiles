import mongoose, { Schema, type Model } from "mongoose";

export const OFFER_ACCENT_COLORS = ["emerald", "amber", "rose", "sky"] as const;
export type OfferAccentColor = (typeof OFFER_ACCENT_COLORS)[number];

export interface OfferAttributes {
  slug: string;
  title: string;
  description: string;
  discountLabel: string;
  badgeLabel: string;
  accentColor: OfferAccentColor;
  expiresAt?: Date;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<OfferAttributes>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 96,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 400 },
    discountLabel: { type: String, required: true, trim: true, maxlength: 60 },
    badgeLabel: { type: String, required: true, trim: true, maxlength: 60 },
    accentColor: { type: String, enum: OFFER_ACCENT_COLORS, required: true, default: "amber" },
    expiresAt: { type: Date },
    isActive: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

offerSchema.index({ sortOrder: 1, createdAt: -1 });

export const Offer: Model<OfferAttributes> =
  (mongoose.models.Offer as Model<OfferAttributes>) ??
  mongoose.model<OfferAttributes>("Offer", offerSchema);
