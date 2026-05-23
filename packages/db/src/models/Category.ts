import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose";
import { DEFAULT_ICON, slugify } from "@store/shared";
import type { IconName, SeoMeta, StructuredContent } from "@store/shared";
import { seoSchema } from "../schemas/seoSchema";
import { structuredContentSchema } from "../schemas/structuredContentSchema";

/**
 * Top-level catalog node. Every product belongs to exactly one category
 * by `slug`; brands, grades, and attributes are category-scoped records
 * authored from the admin catalog pages.
 */

export interface CategoryAttributes {
  slug: string;
  label: string;
  description: string;
  /** Lucide icon export name rendered consistently in admin and storefront. */
  icon: IconName;
  sortOrder: number;
  isActive: boolean;
  /** Optional structured copy (summary + icon-tagged bullets). */
  content?: StructuredContent;
  /** Optional per-category SEO overrides (auto-filled when absent). */
  seo?: SeoMeta;
}

const categorySchema = new Schema<CategoryAttributes>(
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
    label: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, required: true, trim: true, maxlength: 280 },
    icon: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      default: DEFAULT_ICON,
    },
    sortOrder: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
    content: { type: structuredContentSchema, required: false, default: undefined },
    seo: { type: seoSchema, default: () => ({}) },
  },
  { timestamps: true },
);

categorySchema.pre<HydratedDocument<CategoryAttributes>>(
  "validate",
  async function categorySlugAndIcon() {
    if ((!this.slug || this.slug.length === 0) && this.label) {
      this.slug = slugify(this.label, 64);
    }
    if (!this.icon) {
      this.icon = DEFAULT_ICON;
    }
  },
);

categorySchema.index({ sortOrder: 1 });

export const Category: Model<CategoryAttributes> =
  (mongoose.models.Category as Model<CategoryAttributes>) ??
  mongoose.model<CategoryAttributes>("Category", categorySchema);
