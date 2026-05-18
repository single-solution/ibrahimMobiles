import mongoose, { Schema, type Model } from "mongoose";

export const CATEGORY_IDS = ["phone", "accessory", "gadget"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const CONDITION_GRADES = [
  "brand-new",
  "genuine",
  "box-open",
  "refurbished",
  "china-water",
  "lcd-shaded",
] as const;
export type ConditionGrade = (typeof CONDITION_GRADES)[number];

export interface CategoryAttributes {
  /** Stable identifier ("phone", "accessory", "gadget"). Doubles as the slug. */
  categoryId: CategoryId;
  label: string;
  pluralLabel: string;
  pathSegment: string;
  isActive: boolean;
  tagline: string;
  applicableGrades: ConditionGrade[];
  trustChips: string[];
  emptyHint: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryAttributes>(
  {
    categoryId: {
      type: String,
      enum: CATEGORY_IDS,
      required: true,
      unique: true,
      index: true,
    },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    pluralLabel: { type: String, required: true, trim: true, maxlength: 60 },
    pathSegment: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 60,
    },
    isActive: { type: Boolean, required: true, default: true },
    tagline: { type: String, required: true, trim: true, maxlength: 280 },
    applicableGrades: {
      type: [{ type: String, enum: CONDITION_GRADES }],
      required: true,
      default: [],
    },
    trustChips: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      required: true,
      default: [],
    },
    emptyHint: { type: String, required: true, trim: true, maxlength: 280 },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

categorySchema.index({ sortOrder: 1 });

export const Category: Model<CategoryAttributes> =
  (mongoose.models.Category as Model<CategoryAttributes>) ??
  mongoose.model<CategoryAttributes>("Category", categorySchema);
