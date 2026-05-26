import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose";
import { slugify } from "@store/shared";
import type { SeoMeta, StoredImage, StructuredContent } from "@store/shared";
import { seoSchema } from "../schemas/seoSchema";
import { storedImageSchema } from "../schemas/storedImageSchema";
import { structuredContentSchema } from "../schemas/structuredContentSchema";

/**
 * Promotional offer surfaced on the home offers strip and (optionally)
 * on category landing pages. Phase 1 brings the model in line with the
 * rest of the catalogue:
 *
 *   - `accentColor` enum (`emerald` | `amber` | `rose` | `sky`) → free-form
 *     hex `color`. The badge swatch derives its background directly so
 *     admins can match a brand palette without a code change. Same
 *     treatment Grade got in T1.4.
 *   - `slug` is auto-generated from `title` via a pre-validate hook; the
 *     admin UI no longer prompts for it.
 *   - `bannerImage?: StoredImage` (added in T1.1.5) stays as the optional
 *     home-banner artwork — shared `StoredImage` shape, see
 *     `@store/shared/storage/types`.
 *
 * The accentColor → color migration runs in T1.22 (Offer reshape pass).
 * Order constraint: deploying this schema before T1.22 runs would
 * reject every legacy offer (their `color` field is unset). The Phase 1
 * migration commit ships them together.
 */
export interface OfferAttributes {
  slug: string;
  title: string;
  description: string;
  discountLabel: string;
  badgeLabel: string;
  color: string;
  expiresAt?: Date;
  isActive: boolean;
  sortOrder: number;
  bannerImage?: StoredImage;
  /** Optional structured copy (summary + icon-tagged bullets). */
  content?: StructuredContent;
  /** Optional per-offer SEO overrides (auto-filled when absent). */
  seo?: SeoMeta;
}

const offerSchema = new Schema<OfferAttributes>(
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
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 400 },
    discountLabel: { type: String, required: true, trim: true, maxlength: 60 },
    badgeLabel: { type: String, required: true, trim: true, maxlength: 60 },
    color: {
      type: String,
      required: true,
      trim: true,
      maxlength: 7,
      match: /^#[0-9a-f]{6}$/i,
      default: "#e1ff51",
    },
    expiresAt: { type: Date },
    isActive: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
    bannerImage: { type: storedImageSchema, required: false },
    content: { type: structuredContentSchema, required: false, default: undefined },
    seo: { type: seoSchema, default: () => ({}) },
  },
  { timestamps: true },
);

offerSchema.pre<HydratedDocument<OfferAttributes>>(
  "validate",
  async function offerSlugAutogen() {
    if ((!this.slug || this.slug.length === 0) && this.title) {
      this.slug = slugify(this.title, 96);
    }
  },
);

offerSchema.index({ sortOrder: 1, createdAt: -1 });

export const Offer: Model<OfferAttributes> =
  (mongoose.models.Offer as Model<OfferAttributes>) ??
  mongoose.model<OfferAttributes>("Offer", offerSchema);
