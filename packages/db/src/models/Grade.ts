import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose";
import { slugify } from "@store/shared";

/**
 * Condition grade for a category — e.g. "Brand new", "Genuine",
 * "Refurbished", "LCD shaded". After the Phase 1 refactor grades are
 * fully admin-authored and **per category** (a phone's "Brand new"
 * and an accessory's "Brand new" are distinct documents with their own
 * notes and inspection video).
 *
 * Fields removed in T1.4 (PLAN §10):
 *   - `grade` (enum of hardcoded slugs) → replaced by `(categorySlug, slug)`
 *     where `slug` is auto-generated from `label`.
 *   - `shortLabel` → unused; the full `label` is short enough.
 *   - `cosmeticNotes` + `functionalNotes` → collapsed into a single
 *     `notes` long-text field. The split offered no information value to
 *     buyers; admins write a single paragraph.
 *   - `description` → also folded into `notes`. The PDP grade panel
 *     renders a single block of copy now.
 *   - `tone` (GRADE_TONES enum) → replaced by `color`, a free-form hex
 *     string. The storefront badge derives its background from `color`
 *     directly so admins can match a brand palette without a code change.
 *   - `sortOrder` → array order in the parent (category) is canonical;
 *     storefront sorts grades by `categorySlug` lookup then array index.
 *   - `inspectionVideoUrl` (optional) → renamed `video` and made
 *     **required**. Every grade carries a short inspection clip; the PDP
 *     grade block embeds it via the universal video player.
 *
 * Migration caveat (T1.4 step 6): legacy grades carry no `video` URL, so
 * during the Phase 1 migration `video` must be empty. The schema leaves
 * `video` non-required at the model layer; the API-level validator
 * (T1.14 — `apps/admin/src/lib/api/variantValidation.ts` / grades routes)
 * enforces it on every authoring path so admins can never SAVE a
 * grade without one.
 */
export interface GradeAttributes {
  categorySlug: string;
  slug: string;
  label: string;
  notes: string;
  color: string;
  video: string;
}

const gradeSchema = new Schema<GradeAttributes>(
  {
    categorySlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 64,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 64,
    },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    notes: { type: String, required: true, trim: true, maxlength: 1_200 },
    color: {
      type: String,
      required: true,
      trim: true,
      maxlength: 7,
      match: /^#[0-9a-f]{6}$/i,
      default: "#1f2937",
    },
    video: {
      type: String,
      required: false,
      trim: true,
      maxlength: 600,
      default: "",
    },
  },
  { timestamps: true },
);

gradeSchema.pre<HydratedDocument<GradeAttributes>>(
  "validate",
  async function gradeSlugAutogen() {
    if ((!this.slug || this.slug.length === 0) && this.label) {
      this.slug = slugify(this.label, 64);
    }
  },
);

gradeSchema.index({ categorySlug: 1, slug: 1 }, { unique: true });
gradeSchema.index({ categorySlug: 1 });

export const Grade: Model<GradeAttributes> =
  (mongoose.models.Grade as Model<GradeAttributes>) ??
  mongoose.model<GradeAttributes>("Grade", gradeSchema);
