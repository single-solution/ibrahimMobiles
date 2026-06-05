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

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

export const ATTRIBUTE_VISIBILITY_TYPES = [
  "always",
  "brand",
  "grade",
  "attribute",
] as const;
export type AttributeVisibilityType =
  (typeof ATTRIBUTE_VISIBILITY_TYPES)[number];

export interface AttributeVisibility {
  type: AttributeVisibilityType;
  brandSlugs?: string[];
  gradeSlugs?: string[];
  attributeSlug?: string;
  optionValues?: string[];
}

export interface AttributeOption {
  /**
   * Canonical slug persisted on the variant (`attributes[attributeSlug]`).
   * Auto-derived from option `label` + parent attribute `unit`.
   */
  value: string;
  /** Primary display segment (e.g. "256"). */
  label: string;
  /** Optional hex color on option chips / filter rows only (not the attribute heading). */
  backgroundColor?: string;
}

export interface AttributeAttributes {
  categorySlug: string;
  slug: string;
  label: string;
  /** Shared suffix for every option (e.g. "gb" on a Storage attribute). */
  unit?: string;
  options: AttributeOption[];
  /** When this attribute appears in filters / variant UI (default: always). */
  visibility?: AttributeVisibility;
  cardPosition: AttributeCardPosition;
  isActive: boolean;
}

const attributeVisibilitySchema = new Schema<AttributeVisibility>(
  {
    type: {
      type: String,
      enum: ATTRIBUTE_VISIBILITY_TYPES,
      required: true,
      default: "always",
    },
    brandSlugs: [{ type: String, trim: true, lowercase: true }],
    gradeSlugs: [{ type: String, trim: true, lowercase: true }],
    attributeSlug: { type: String, trim: true, lowercase: true },
    optionValues: [{ type: String, trim: true, lowercase: true }],
  },
  { _id: false },
);

const ATTRIBUTE_VALUE_MAX_LENGTH = 80;
const ATTRIBUTE_LABEL_MAX_LENGTH = 80;
const HEX_COLOR_LENGTH = 7;
const CATEGORY_SLUG_MAX_LENGTH = 60;
const ATTRIBUTE_SLUG_MAX_LENGTH = 60;
const UNIT_MAX_LENGTH = 20;

const attributeOptionSchema = new Schema<AttributeOption>(
  {
    value: { type: String, required: true, trim: true, maxlength: ATTRIBUTE_VALUE_MAX_LENGTH },
    label: { type: String, required: true, trim: true, maxlength: ATTRIBUTE_LABEL_MAX_LENGTH },
    backgroundColor: { type: String, trim: true, maxlength: HEX_COLOR_LENGTH, match: HEX_COLOR_REGEX },
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
      maxlength: CATEGORY_SLUG_MAX_LENGTH,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: ATTRIBUTE_SLUG_MAX_LENGTH,
    },
    label: { type: String, required: true, trim: true, maxlength: ATTRIBUTE_LABEL_MAX_LENGTH },
    unit: { type: String, trim: true, maxlength: UNIT_MAX_LENGTH },
    options: {
      type: [attributeOptionSchema],
      required: true,
      validate: {
        validator: (value: AttributeOption[]) =>
          Array.isArray(value) && value.length > 0,
        message: "Attribute must have at least one option.",
      },
    },
    visibility: {
      type: attributeVisibilitySchema,
      default: () => ({ type: "always" as const }),
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
    if (this?.slug && this.slug.length > 0) {
      return;
    }
    if (!this?.label) {
      return;
    }
    this.slug = slugify(this.label, ATTRIBUTE_SLUG_MAX_LENGTH);
  },
);

attributeSchema.index({ categorySlug: 1, slug: 1 }, { unique: true });
attributeSchema.index({ categorySlug: 1, isActive: 1 });

export const Attribute: Model<AttributeAttributes> =
  (mongoose.models.Attribute as Model<AttributeAttributes>) ??
  mongoose.model<AttributeAttributes>("Attribute", attributeSchema);
