import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose";
import { slugify } from "@store/shared";

/**
 * Admin-creatable filter dimension that's per-category. `Brand` and `Grade`
 * are the two *system* dimensions every category gets for free (they have
 * their own first-class models). Everything else — Storage, RAM, Color,
 * Connector, Wattage, Screen size, Accessory type, etc. — lives here.
 *
 * Every attribute is a *single-select* dimension whose accepted values are
 * authored inline in `options[]`. The product/variant `attributes` map
 * references the attribute by `slug` — e.g. `variant.attributes.storage = "128"`.
 * Variant scope only: there is no product-level attribute scope after the
 * Phase 1 refactor (PLAN §10).
 *
 * Hard-removed in Phase 1 vs. the legacy model: `key` (renamed `slug`,
 * auto-generated), `type` (always single-select), `scope` (always variant),
 * `unit`, `sortOrder` (replaced by array position in the parent doc), and
 * per-option `sortOrder` (option array order is canonical).
 */
export const ATTRIBUTE_CARD_POSITIONS = [
  "image-overlay",
  "title-chips",
  "none",
] as const;
export type AttributeCardPosition = (typeof ATTRIBUTE_CARD_POSITIONS)[number];

export interface AttributeOption {
  /**
   * Canonical, URL-safe value persisted on the product/variant. Combined
   * with the parent attribute's `slug` this produces the storefront filter
   * URL parameter (e.g. `?storage=128`, `?color=midnight`).
   */
  value: string;
  /** Human-readable label rendered in chips / dropdowns ("128 GB", "Midnight"). */
  label: string;
}

export interface AttributeAttributes {
  categorySlug: string;
  slug: string;
  label: string;
  options: AttributeOption[];
  cardPosition: AttributeCardPosition;
  isActive: boolean;
}

const attributeOptionSchema = new Schema<AttributeOption>(
  {
    value: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { _id: false },
);

const attributeSchema = new Schema<AttributeAttributes>(
  {
    categorySlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 60,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 60,
    },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    options: {
      type: [attributeOptionSchema],
      required: true,
      validate: {
        validator: (value: AttributeOption[]) =>
          Array.isArray(value) && value.length > 0,
        message: "Attribute must have at least one option.",
      },
    },
    cardPosition: {
      type: String,
      enum: ATTRIBUTE_CARD_POSITIONS,
      required: true,
      default: "title-chips",
    },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

attributeSchema.pre<HydratedDocument<AttributeAttributes>>(
  "validate",
  async function attributeSlugAutogen() {
    if ((!this.slug || this.slug.length === 0) && this.label) {
      this.slug = slugify(this.label, 60);
    }
  },
);

attributeSchema.index({ categorySlug: 1, slug: 1 }, { unique: true });
attributeSchema.index({ categorySlug: 1, isActive: 1 });

export const Attribute: Model<AttributeAttributes> =
  (mongoose.models.Attribute as Model<AttributeAttributes>) ??
  mongoose.model<AttributeAttributes>("Attribute", attributeSchema);
