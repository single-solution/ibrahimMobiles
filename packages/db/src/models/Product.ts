import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose";

import { slugify } from "@store/shared";
import type { StoredImage } from "@store/shared";

import { storedImageSchema } from "../schemas/storedImageSchema";

/**
 * A catalogue listing. After the Phase 1 refactor a `Product` is a thin
 * shell: an identity (name + slug), a category + brand assignment, some
 * flags, and a list of variants. **All content lives on the variants** —
 * imagery, pricing, stock, grade, and the category's dynamic attribute
 * values are variant-level. The product-level imagery / highlights /
 * hardcoded category-specific fields are gone.
 *
 * Removed at the product level (T1.5 / PLAN §10):
 *   - `modelName` → renamed `name`.
 *   - `imageUrl`, `galleryUrls` → all imagery moves to `variants[i].images`
 *     as `StoredImage[]`. The PDP picks variant[0].images for the hero
 *     pile and lets the variant selector swap it.
 *   - `highlights` → not used by the new storefront PDP design.
 *   - `attributes` (product-level dict) → all attributes are variant-scoped now.
 *   - `accessoryType`, `gadgetType`, `releaseYear` → hardcoded category-
 *     specific fields. Replaced by category-defined `Attribute` rows.
 *
 * The variant subdocument is rewritten in lockstep (T1.6 — see
 * `variantSchema` below).
 */

/**
 * Variant — the unit of inventory + imagery + dynamic attributes. Every
 * stock change happens at the variant level. Image entries are full
 * `StoredImage` records (4 pre-rendered WebP variants + blurhash + dims
 * + alt) from day one; see `@store/shared/storage/types`.
 *
 * Removed at the variant level (T1.6 / PLAN §10):
 *   - `grade` (legacy ConditionGrade enum) → `gradeSlug: string`. Validated
 *     at the API layer against the `Grade` collection for the product's
 *     `categorySlug` (T1.14). No schema-level enum because admins
 *     create grades per category.
 *   - `imageUrls: string[]` → `images: StoredImage[]` (≥1, index 0 = hero).
 *   - `isInStock: boolean` → derived from `quantity > 0` at serializer time.
 *     `quantity: number` is the source of truth (integer ≥ 0).
 *   - Hardcoded typed fields (`storageGb`, `ramGb`, `batteryHealthMin/Max`,
 *     `isPtaApproved`, `connector`, `wattage`, `lengthMeters`, `isGenuine`,
 *     `colorName`) → all become rows in `Attribute` with `options`.
 *     Variant's `attributes: Record<string, string>` is the per-row chosen
 *     option value (single-select only — see PLAN §15 for the rationale).
 *   - `originalPriceRupees`, `notes` → unused on the storefront after the
 *     refactor.
 */
export interface VariantAttributes {
  /** Mongoose-generated when pushing into the parent doc. */
  _id?: mongoose.Types.ObjectId;
  gradeSlug: string;
  priceRupees: number;
  quantity: number;
  warrantyMonths?: number;
  images: StoredImage[];
  /**
   * Per-attribute chosen option value. Keys are `Attribute.slug` (per the
   * product's category); values are option `value` strings from
   * `Attribute.options[].value`. Single-select; multi-select is out of
   * scope for this iteration (PLAN §15).
   */
  attributes: Record<string, string>;
}

export interface ProductAttributes {
  slug: string;
  name: string;
  brandSlug: string;
  categorySlug: string;
  isActive: boolean;
  isArchived: boolean;
  isFeatured: boolean;
  variants: VariantAttributes[];
}

const variantSchema = new Schema<VariantAttributes>(
  {
    gradeSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 64,
    },
    priceRupees: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    warrantyMonths: { type: Number, min: 0 },
    images: {
      type: [storedImageSchema],
      required: true,
      validate: {
        validator: (value: StoredImage[]) =>
          Array.isArray(value) && value.length > 0,
        message: "Variant must have at least one image.",
      },
    },
    attributes: {
      type: Schema.Types.Mixed,
      required: true,
      default: {} as Record<string, string>,
    },
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
    name: { type: String, required: true, trim: true, maxlength: 120 },
    brandSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 64,
      index: true,
    },
    categorySlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 64,
      index: true,
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

productSchema.pre<HydratedDocument<ProductAttributes>>(
  "validate",
  async function productSlugAutogen() {
    if ((!this.slug || this.slug.length === 0) && this.name) {
      this.slug = slugify(this.name, 96);
    }
  },
);

// Storefront list/sort coverage:
//   • `{ categorySlug, isActive, isArchived, name }` supports name-asc sort.
//   • `{ categorySlug, isActive, isArchived, createdAt:-1 }` covers the
//     dominant "newest first" path used by home + default /shop/[slug].
//   • `{ categorySlug, isActive, isArchived, isFeatured:-1, createdAt:-1 }`
//     covers the featured rail.
//   • `{ brandSlug, name }` for the brand landing path.
productSchema.index({ categorySlug: 1, isActive: 1, isArchived: 1, name: 1 });
productSchema.index({ categorySlug: 1, isActive: 1, isArchived: 1, createdAt: -1 });
productSchema.index({
  categorySlug: 1,
  isActive: 1,
  isArchived: 1,
  isFeatured: -1,
  createdAt: -1,
});
productSchema.index({ brandSlug: 1, name: 1 });
// Admin list coverage: cross-category "all products" sort by recency.
productSchema.index({ isArchived: 1, createdAt: -1 });

export const Product: Model<ProductAttributes> =
  (mongoose.models.Product as Model<ProductAttributes>) ??
  mongoose.model<ProductAttributes>("Product", productSchema);
