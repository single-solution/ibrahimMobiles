/**
 * Optional per-entity SEO override. Every public-facing entity
 * (Product, Category, Brand, Offer) can carry one of these. When a
 * field is `undefined`, the storefront falls back to the auto-computed
 * value from `composeSeoMeta(...)` (see `apps/web/src/lib/seo/`).
 *
 * This is the wire shape — both Mongoose schemas and admin
 * serializers reference it directly so what the admin sees in the
 * editor is exactly what the storefront renderer reads back.
 */
export interface SeoFaqEntry {
	question: string;
	answer: string;
}

export interface SeoMeta {
	/** Override for `<title>` (post-template). */
	title?: string;
	/** Override for `<meta name="description">`. */
	description?: string;
	/** Absolute or relative URL for `<link rel="canonical">`. */
	canonicalUrl?: string;
	/** Override for `og:image` / `twitter:image`. */
	ogImageUrl?: string;
	/** SEO checklist + Rank Math-style hint computations. */
	focusKeyword?: string;
	/** Cached SEO score out of 100 to avoid expensive runtime calculations on list views. */
	score?: number;
	/** Adds `noindex` to the robots meta. */
	noindex?: boolean;
	/** Adds `nofollow` to the robots meta. */
	nofollow?: boolean;
	/** AI-generated FAQ pairs for PDP JSON-LD (Layer 2). */
	faqs?: SeoFaqEntry[];
	/** ISO timestamp when Layer 2 AI last wrote title/description/faqs. */
	aiGeneratedAt?: string;
	/** Provider model id used for the last AI generation. */
	aiModelId?: string;
}

export const SEO_META_FIELD_LIMITS = {
	title: 200,
	description: 320,
	canonicalUrl: 600,
	ogImageUrl: 600,
	focusKeyword: 80,
	faqQuestion: 200,
	faqAnswer: 320,
	maxFaqs: 8,
} as const;

/**
 * Internal: build a robots string ("index,follow" / "noindex,follow"
 * / etc.) from the two boolean flags. Used by both the storefront
 * renderer and the admin preview component.
 */
export function buildRobotsDirective(meta: SeoMeta | undefined): string {
	const index = meta?.noindex ? "noindex" : "index";
	const follow = meta?.nofollow ? "nofollow" : "follow";
	return `${index},${follow}`;
}
