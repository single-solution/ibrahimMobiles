import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import { slugify } from "@store/shared";
import type { SeoMeta, StructuredContent } from "@store/shared";
import { seoSchema } from "../schemas/seoSchema";
import { structuredContentSchema } from "../schemas/structuredContentSchema";

/**
 * Per-category condition grade (e.g. "Brand new", "Like new"). Each category owns
 * its vocabulary, notes, inspection video, and badge color.
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
	/** Glossary page SEO (formula + optional AI polish). */
	seo?: SeoMeta;
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
		seo: { type: seoSchema, required: false, default: undefined },
	},
	{ timestamps: true },
);

gradeSchema.pre<HydratedDocument<GradeAttributes>>("validate", async function gradeSlugAutogen() {
	if (this?.slug && this.slug.length > 0) {
		return;
	}
	if (!this?.label) {
		return;
	}
	this.slug = slugify(this.label, GRADE_SLUG_MAX_LENGTH);
});

gradeSchema.index({ categorySlug: 1, slug: 1 }, { unique: true });
gradeSchema.index({ categorySlug: 1, isActive: 1 });

export const Grade: Model<GradeAttributes> = (mongoose.models.Grade as Model<GradeAttributes>) ?? mongoose.model<GradeAttributes>("Grade", gradeSchema);
