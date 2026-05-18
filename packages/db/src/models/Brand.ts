import mongoose, { Schema, type Model } from "mongoose";

export interface BrandAttributes {
  slug: string;
  name: string;
  tagline: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema = new Schema<BrandAttributes>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 64,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    tagline: { type: String, required: true, trim: true, maxlength: 200 },
    isActive: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

brandSchema.index({ sortOrder: 1, name: 1 });

export const Brand: Model<BrandAttributes> =
  (mongoose.models.Brand as Model<BrandAttributes>) ??
  mongoose.model<BrandAttributes>("Brand", brandSchema);
