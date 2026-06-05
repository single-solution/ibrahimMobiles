import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose";
import { slugify } from "@store/shared";
import type { StructuredContent } from "@store/shared";
import { structuredContentSchema } from "../schemas/structuredContentSchema";

/**
 * Condition grade for a category — e.g. "Brand new", "Like new",
 * "Refurbished", "Pre-owned". After the Phase 1 refactor grades are
 * fully admin-authored and **per category** — each category owns its
 * own grade vocabulary with its own notes and inspection video.
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
 *     grade block embeds it via the shared video player.
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
  /** Optional structured copy (summary + icon-tagged bullets). */
  content?: StructuredContent;
  /** Storefront visibility — hidden grades drop out of filters and chips. */
  isActive: boolean;
}

const CATEGORY_SLUG_MAX_LENGTH = 64;
const GRADE_SLUG_MAX_LENGTH = 64;
const GRADE_LABEL_MAX_LENGTH = 80;
const GRADE_NOTES_MAX_LENGTH = 1_200;
const HEX_COLOR_LENGTH = 7;
const VIDEO_URL_MAX_LENGTH = 600;

const gradeSchema = new Schema<GradeAttributes>(
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
      maxlength: GRADE_SLUG_MAX_LENGTH,
    },
    label: { type: String, required: true, trim: true, maxlength: GRADE_LABEL_MAX_LENGTH },
    notes: { type: String, required: true, trim: true, maxlength: GRADE_NOTES_MAX_LENGTH },
    color: {
      type: String,
      required: true,
      trim: true,
      maxlength: HEX_COLOR_LENGTH,
      match: /^#[0-9a-f]{6}$/i,
      default: "#1f2937",
    },
    video: {
      type: String,
      required: false,
      trim: true,
      maxlength: VIDEO_URL_MAX_LENGTH,
      default: "",
    },
    content: { type: structuredContentSchema, required: false, default: undefined },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

gradeSchema.pre<HydratedDocument<GradeAttributes>>(
  "validate",
  async function gradeSlugAutogen() {
    if (this?.slug && this.slug.length > 0) {
      return;
    }
    if (!this?.label) {
      return;
    }
    this.slug = slugify(this.label, GRADE_SLUG_MAX_LENGTH);
  },
);

gradeSchema.index({ categorySlug: 1, slug: 1 }, { unique: true });
gradeSchema.index({ categorySlug: 1, isActive: 1 });

export const Grade: Model<GradeAttributes> =
  (mongoose.models.Grade as Model<GradeAttributes>) ??
  mongoose.model<GradeAttributes>("Grade", gradeSchema);
