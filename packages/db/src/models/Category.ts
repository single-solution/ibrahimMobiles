import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose";
import { slugify } from "@store/shared";
import type { StoredImage } from "@store/shared";
import { storedImageSchema } from "../schemas/storedImageSchema";

/**
 * Top-level catalogue node. After the Phase 1 refactor every product
 * lives under exactly one `Category` (looked up by `slug`); brands,
 * grades, and attributes are all *per-category*. Admins create
 * categories through the new categories workspace (Phase 3 / Flow A in
 * PLAN.md §3); the legacy hard-coded `("phone" | "accessory" | "gadget")`
 * triad is gone.
 *
 * Fields removed in this rewrite (T1.2 / PLAN §10):
 *   - `categoryId` enum → replaced by `slug` (auto-generated from label).
 *   - `pluralLabel` → unused on the storefront (the singular `label` is
 *      sufficient; pluralisation happens in copy where it matters).
 *   - `pathSegment` → URLs now derive directly from `slug`.
 *   - `tagline` → renamed to `description` to match the rest of the
 *      catalogue surface and to unify the SEO derivation rules in §13.
 *   - `trustChips`, `emptyHint`, `applicableGrades` → either dead on the
 *      storefront or moved to the per-category Grade documents.
 *
 * `CONDITION_GRADES` (the legacy enum of hardcoded grade slugs) is moved
 * to `Grade` in T1.4 as its enum source-of-truth.
 */

export const CATEGORY_ICON_KINDS = ["emoji", "image"] as const;
export type CategoryIconKind = (typeof CATEGORY_ICON_KINDS)[number];

/**
 * @deprecated Legacy enum kept here only so `Product.ts` continues to
 *   compile between T1.2 (this commit) and T1.5 (Product rewrite). The
 *   hardcoded three-value taxonomy is gone after Phase 1: `Product.category`
 *   becomes `categorySlug: string` resolved against the `Category`
 *   collection. **Do not add new references.**
 */
export const CATEGORY_IDS = ["phone", "accessory", "gadget"] as const;
/** @deprecated See `CATEGORY_IDS`. */
export type CategoryId = (typeof CATEGORY_IDS)[number];

/**
 * @deprecated Legacy enum kept here only so `Product.ts` continues to
 *   compile between T1.2 (this commit) and T1.4 (Grade rewrite). Grade
 *   then becomes the enum source-of-truth (database-driven, per category),
 *   and `ConditionGrade` ceases to exist as a TS literal union.
 *   **Do not add new references.**
 */
export const CONDITION_GRADES = [
  "brand-new",
  "genuine",
  "box-open",
  "refurbished",
  "china-water",
  "lcd-shaded",
] as const;
/** @deprecated See `CONDITION_GRADES`. */
export type ConditionGrade = (typeof CONDITION_GRADES)[number];

export interface CategoryAttributes {
  slug: string;
  label: string;
  description: string;
  /**
   * Discriminated icon union — exactly one of `iconEmoji` / `iconImage` is
   * set per `iconKind`. The pre-validate hook nullifies the inactive side
   * so reads can rely on the discriminator without defensive guards.
   */
  iconKind: CategoryIconKind;
  iconEmoji?: string;
  iconImage?: StoredImage;
  sortOrder: number;
  isActive: boolean;
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
    iconKind: {
      type: String,
      enum: CATEGORY_ICON_KINDS,
      required: true,
      default: "emoji",
    },
    iconEmoji: { type: String, trim: true, maxlength: 8 },
    iconImage: { type: storedImageSchema, required: false },
    sortOrder: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

categorySchema.pre<HydratedDocument<CategoryAttributes>>(
  "validate",
  async function categorySlugAndIconDiscriminator() {
    if ((!this.slug || this.slug.length === 0) && this.label) {
      this.slug = slugify(this.label, 64);
    }
    if (this.iconKind === "emoji") {
      this.iconImage = undefined;
    } else if (this.iconKind === "image") {
      this.iconEmoji = undefined;
    }
  },
);

categorySchema.index({ sortOrder: 1 });

export const Category: Model<CategoryAttributes> =
  (mongoose.models.Category as Model<CategoryAttributes>) ??
  mongoose.model<CategoryAttributes>("Category", categorySchema);
