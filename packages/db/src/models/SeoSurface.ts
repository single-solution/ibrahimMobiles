import mongoose, { Schema, type Model } from "mongoose";

/**
 * Cached SEO copy for a category x brand x grade intent landing URL.
 * Keyed by the three slugs; stats refreshed on catalog drift.
 */
export interface SeoSurfaceAttributes {
	categorySlug: string;
	brandSlug: string;
	gradeSlug: string;
	/** SERP title (formula or AI-polished). */
	title: string;
	/** Meta description. */
	description: string;
	/** Visible H1 on the filter landing page. */
	headline: string;
	/** Intro paragraph below the H1. */
	intro: string;
	/** Staff override for SERP title; wins over `title` at read time. */
	titleOverride?: string;
	/** Staff override for meta description. */
	descriptionOverride?: string;
	/** Staff override for visible H1. */
	headlineOverride?: string;
	/** Staff override for intro paragraph. */
	introOverride?: string;
	/** Normalized query string (`?brand=…&grade=…`). */
	canonicalQuery: string;
	inStockVariantCount: number;
	productCount: number;
	minPriceRupees?: number;
	maxPriceRupees?: number;
	/** All index eligibility rules pass at last sync. */
	isIndexable: boolean;
	lastStockCheckAt: Date;
	aiGeneratedAt?: string;
	aiModelId?: string;
}

const SLUG_MAX_LENGTH = 64;
const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 320;
const HEADLINE_MAX_LENGTH = 120;
const INTRO_MAX_LENGTH = 600;
const CANONICAL_QUERY_MAX_LENGTH = 200;

const seoSurfaceSchema = new Schema<SeoSurfaceAttributes>(
	{
		categorySlug: {
			type: String,
			required: true,
			lowercase: true,
			trim: true,
			maxlength: SLUG_MAX_LENGTH,
		},
		brandSlug: {
			type: String,
			required: true,
			lowercase: true,
			trim: true,
			maxlength: SLUG_MAX_LENGTH,
		},
		gradeSlug: {
			type: String,
			required: true,
			lowercase: true,
			trim: true,
			maxlength: SLUG_MAX_LENGTH,
		},
		title: { type: String, required: true, trim: true, maxlength: TITLE_MAX_LENGTH },
		description: { type: String, required: true, trim: true, maxlength: DESCRIPTION_MAX_LENGTH },
		headline: { type: String, required: true, trim: true, maxlength: HEADLINE_MAX_LENGTH },
		intro: { type: String, required: true, trim: true, maxlength: INTRO_MAX_LENGTH },
		titleOverride: { type: String, trim: true, maxlength: TITLE_MAX_LENGTH },
		descriptionOverride: { type: String, trim: true, maxlength: DESCRIPTION_MAX_LENGTH },
		headlineOverride: { type: String, trim: true, maxlength: HEADLINE_MAX_LENGTH },
		introOverride: { type: String, trim: true, maxlength: INTRO_MAX_LENGTH },
		canonicalQuery: { type: String, required: true, trim: true, maxlength: CANONICAL_QUERY_MAX_LENGTH },
		inStockVariantCount: { type: Number, required: true, default: 0 },
		productCount: { type: Number, required: true, default: 0 },
		minPriceRupees: { type: Number },
		maxPriceRupees: { type: Number },
		isIndexable: { type: Boolean, required: true, default: false },
		lastStockCheckAt: { type: Date, required: true, default: () => new Date() },
		aiGeneratedAt: { type: String, trim: true },
		aiModelId: { type: String, trim: true },
	},
	{ timestamps: true },
);

seoSurfaceSchema.index({ categorySlug: 1, brandSlug: 1, gradeSlug: 1 }, { unique: true });
seoSurfaceSchema.index({ isIndexable: 1, categorySlug: 1 });

export const SeoSurface: Model<SeoSurfaceAttributes> =
	(mongoose.models.SeoSurface as Model<SeoSurfaceAttributes>) ?? mongoose.model<SeoSurfaceAttributes>("SeoSurface", seoSurfaceSchema);
