import mongoose, { Schema, type Model } from "mongoose";

import { MAX_PRODUCT_RELEASE_YEAR, MIN_PRODUCT_RELEASE_YEAR } from "@store/shared";

import { CATEGORY_IDS, CONDITION_GRADES, type CategoryId, type ConditionGrade } from "./Category";

export const ACCESSORY_TYPES = [
  "charger",
  "cable",
  "case",
  "earbuds",
  "screen-protector",
  "power-bank",
  "other",
] as const;
export type AccessoryType = (typeof ACCESSORY_TYPES)[number];

export const CONNECTOR_TYPES = [
  "usb-c",
  "lightning",
  "micro-usb",
  "wireless",
  "n-a",
] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export interface VariantAttributes {
  /** Mongoose-generated when pushing into the parent doc. */
  _id?: mongoose.Types.ObjectId;
  grade: ConditionGrade;
  colorName: string;
  priceRupees: number;
  originalPriceRupees: number;
  isInStock: boolean;
  warrantyMonths: number;
  notes?: string;

  // Phone fields (optional — present only when category = phone).
  storageGb?: number;
  ramGb?: number;
  batteryHealthMinPercent?: number;
  batteryHealthMaxPercent?: number;
  isPtaApproved?: boolean;

  // Accessory fields.
  connector?: ConnectorType;
  wattage?: number;
  lengthMeters?: number;
  isGenuine?: boolean;
}

export interface ProductAttributes {
  slug: string;
  modelName: string;
  brandId: mongoose.Types.ObjectId;
  category: CategoryId;
  /** Required when category = "accessory". */
  accessoryType?: AccessoryType;
  /** Required when category = "gadget". Free-form short label
   *  (e.g. "Console", "Smart watch", "Drone"). */
  gadgetType?: string;
  imageUrl: string;
  galleryUrls: string[];
  releaseYear: number;
  highlights: string[];
  isFeatured: boolean;
  isActive: boolean;
  isArchived: boolean;
  variants: VariantAttributes[];
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<VariantAttributes>(
  {
    grade: { type: String, enum: CONDITION_GRADES, required: true },
    colorName: { type: String, required: true, trim: true, maxlength: 60 },
    priceRupees: { type: Number, required: true, min: 0 },
    originalPriceRupees: { type: Number, required: true, min: 0 },
    isInStock: { type: Boolean, required: true, default: true },
    warrantyMonths: { type: Number, required: true, min: 0, default: 6 },
    notes: { type: String, trim: true, maxlength: 500 },

    storageGb: { type: Number, min: 1 },
    ramGb: { type: Number, min: 0 },
    batteryHealthMinPercent: { type: Number, min: 0, max: 100 },
    batteryHealthMaxPercent: { type: Number, min: 0, max: 100 },
    isPtaApproved: { type: Boolean },

    connector: { type: String, enum: CONNECTOR_TYPES },
    wattage: { type: Number, min: 0 },
    lengthMeters: { type: Number, min: 0 },
    isGenuine: { type: Boolean },
  },
  { _id: true, timestamps: false },
);

const productSchema = new Schema<ProductAttributes>(
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
    modelName: { type: String, required: true, trim: true, maxlength: 120 },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
    category: { type: String, enum: CATEGORY_IDS, required: true, index: true },
    accessoryType: { type: String, enum: ACCESSORY_TYPES },
    gadgetType: { type: String, trim: true, maxlength: 60 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 500 },
    galleryUrls: {
      type: [{ type: String, trim: true, maxlength: 500 }],
      default: [],
    },
    releaseYear: {
      type: Number,
      required: true,
      min: MIN_PRODUCT_RELEASE_YEAR,
      max: MAX_PRODUCT_RELEASE_YEAR,
    },
    highlights: {
      type: [{ type: String, trim: true, maxlength: 200 }],
      default: [],
    },
    isFeatured: { type: Boolean, required: true, default: false },
    isActive: { type: Boolean, required: true, default: true },
    isArchived: { type: Boolean, required: true, default: false },
    variants: {
      type: [variantSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Storefront list/sort coverage:
//   • `modelName` index supports the legacy `name-asc` sort path.
//   • `createdAt:-1` covers the dominant "newest first" path used by the
//     home page and the default `/shop/[category]` sort. Without this, a
//     50k-product catalog forced an in-memory sort on every shop hit.
//   • `releaseYear:-1, createdAt:-1` covers the hero rail + "Just released".
productSchema.index({ category: 1, isActive: 1, isArchived: 1, modelName: 1 });
productSchema.index({ category: 1, isActive: 1, isArchived: 1, createdAt: -1 });
productSchema.index({ category: 1, isActive: 1, isArchived: 1, releaseYear: -1, createdAt: -1 });
productSchema.index({ brandId: 1, modelName: 1 });
// Admin list coverage:
//   The admin /products page does `find({ isArchived: { $ne: true } })
//   .sort({ createdAt: -1 })` across ALL categories. The storefront's
//   compound indexes don't cover this because their leading key is
//   `category`. A dedicated `{ isArchived, createdAt }` index keeps the
//   admin grid snappy as the catalog grows.
productSchema.index({ isArchived: 1, createdAt: -1 });

export const Product: Model<ProductAttributes> =
  (mongoose.models.Product as Model<ProductAttributes>) ??
  mongoose.model<ProductAttributes>("Product", productSchema);
