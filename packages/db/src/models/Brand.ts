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

const brandSchema = new Schema<BrandAttributes>(
  {
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 64,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    categorySlugs: {
      type: [
        {
          type: String,
          lowercase: true,
          trim: true,
          maxlength: 64,
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
    if ((!this.slug || this.slug.length === 0) && this.name) {
      this.slug = slugify(this.name, 64);
    }
  },
);

brandSchema.index({ categorySlugs: 1, isActive: 1, name: 1 });
brandSchema.index({ categorySlugs: 1, slug: 1 }, { unique: true });
brandSchema.index({ name: 1 });

export const Brand: Model<BrandAttributes> =
  (mongoose.models.Brand as Model<BrandAttributes>) ??
  mongoose.model<BrandAttributes>("Brand", brandSchema);
