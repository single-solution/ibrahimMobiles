import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose";
import { slugify } from "@store/shared";
import type { SeoMeta } from "@store/shared";
import { seoSchema } from "../schemas/seoSchema";

/**
 * Manufacturer / vendor that produces one or more products. After the
 * Phase 1 refactor brands are *per-category* — every brand declares
 * which categories it applies to via `categorySlugs[]`, which drives:
 *
 *   - the per-category brand chips on the categories workspace cards
 *     (PLAN §3 Flow A),
 *   - the brand picker shown to admins on the product-create form (only
 *     brands whose `categorySlugs` includes the chosen category appear),
 *   - the storefront brand filter on a category landing page.
 *
 * Fields removed in T1.3:
 *   - `tagline` → unused on the storefront; not worth carrying.
 */
export interface BrandAttributes {
  slug: string;
  name: string;
  categorySlugs: string[];
  isActive: boolean;
  /** Optional per-brand SEO overrides (auto-filled when absent). */
  seo?: SeoMeta;
}

const BRAND_SLUG_MAX_LENGTH = 64;
const BRAND_NAME_MAX_LENGTH = 100;

const brandSchema = new Schema<BrandAttributes>(
  {
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: BRAND_SLUG_MAX_LENGTH,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: BRAND_NAME_MAX_LENGTH },
    categorySlugs: {
      type: [
        {
          type: String,
          lowercase: true,
          trim: true,
          maxlength: BRAND_SLUG_MAX_LENGTH,
        },
      ],
      required: true,
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) && value.length > 0,
        message: "Brand must belong to at least one category.",
      },
    },
    isActive: { type: Boolean, required: true, default: true },
    seo: { type: seoSchema, default: () => ({}) },
  },
  { timestamps: true },
);

brandSchema.pre<HydratedDocument<BrandAttributes>>(
  "validate",
  async function brandSlugAutogen() {
    if (this?.slug && this.slug.length > 0) {
      return;
    }
    if (!this?.name) {
      return;
    }
    this.slug = slugify(this.name, BRAND_SLUG_MAX_LENGTH);
  },
);

brandSchema.index({ categorySlugs: 1, isActive: 1, name: 1 });
brandSchema.index({ categorySlugs: 1, slug: 1 }, { unique: true });
brandSchema.index({ name: 1 });

export const Brand: Model<BrandAttributes> =
  (mongoose.models.Brand as Model<BrandAttributes>) ??
  mongoose.model<BrandAttributes>("Brand", brandSchema);
