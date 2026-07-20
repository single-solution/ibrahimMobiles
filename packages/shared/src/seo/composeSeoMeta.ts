/**
 * Pure `(entity, settings) → ResolvedSeoMeta` composition.
 * Shared by storefront render and admin SERP preview.
 */

import type { Brand, Offer, Product, Variant } from "../types";
import {
	buildProductSeoDescription,
	buildProductSeoFacts,
	buildProductSeoTitle,
	buildProductTitleTemplateVars,
	buildVariantSeoDescription,
	buildVariantSeoTitle,
	DEFAULT_PRODUCT_TITLE_TEMPLATE,
	type ProductSeoFactsContext,
} from "./productSeoFacts";
import {
	buildAttributeGlossaryDescription,
	buildAttributeGlossaryTitle,
	buildGradeGlossaryDescription,
	buildGradeGlossaryTitle,
} from "./glossarySeoFacts";
import type { IntentSurfaceKey } from "./intentSurface";
import { buildRobotsDirective, type SeoMeta } from "./seoMeta";
import { applyTitleTemplate } from "./titleTemplate";

export type { ProductSeoFacts, ProductSeoFactsContext } from "./productSeoFacts";
export {
	buildProductSeoFacts,
	buildProductSeoDescription,
	buildProductSeoTitle,
	buildVariantSeoDescription,
	buildVariantSeoTitle,
	deriveProductFocusKeyword,
} from "./productSeoFacts";

export interface ResolvedSeoMeta {
	title: string;
	description: string;
	canonical: string;
	ogImageUrl: string;
	twitterCard: "summary" | "summary_large_image";
	robots: string;
}

export interface SeoSettings {
	siteName: string;
	siteTagline: string;
	siteUrl: string;
	seoStoreName: string;
	titleTemplate: string;
	defaultDescription: string;
	defaultOgImageUrl: string;
}

export interface CategorySeoRef {
	slug: string;
	label: string;
	description?: string;
}

export interface BrandSeoRef {
	slug: string;
	name: string;
}

const DESCRIPTION_MAX = 160;

function truncateDescription(input: string): string {
	if (input.length <= DESCRIPTION_MAX) return input;
	const slice = input.slice(0, DESCRIPTION_MAX);
	const lastSpace = slice.lastIndexOf(" ");
	return lastSpace > 80 ? slice.slice(0, lastSpace).trimEnd() + "…" : slice + "…";
}

function absoluteUrl(siteUrl: string, path: string): string {
	if (/^https?:\/\//i.test(path)) return path;
	return `${siteUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function resolveStoreName(settings: SeoSettings): string {
	return settings.seoStoreName.trim() || settings.siteName;
}

function resolveTitle(override: string | undefined, baseTitle: string, settings: SeoSettings, extraVars: Record<string, string> = {}): string {
	if (override && override.trim().length > 0) {
		return override.trim();
	}
	return applyTitleTemplate(settings.titleTemplate, {
		title: baseTitle,
		storeName: resolveStoreName(settings),
		...extraVars,
	});
}

function resolveDescription(override: string | undefined, derived: string, fallback: string): string {
	const raw = override?.trim() || (derived.trim().length > 0 ? derived.trim() : fallback.trim());
	return truncateDescription(raw);
}

function resolveCanonical(override: string | undefined, path: string, siteUrl: string): string {
	if (override && override.trim().length > 0) {
		return absoluteUrl(siteUrl, override.trim());
	}
	return absoluteUrl(siteUrl, path);
}

function resolveOgImage(override: string | undefined, derived: string | undefined, fallback: string, siteUrl: string): string {
	const raw = override?.trim() || derived?.trim() || fallback.trim();
	if (!raw) return "";
	return absoluteUrl(siteUrl, raw);
}

export function composeProductSeo({
	product,
	variant: _variant,
	brand,
	category,
	settings,
	seo,
	factsContext,
}: {
	product: Product;
	/** Kept for call-site compatibility; formulas use the full variant matrix. */
	variant: Variant;
	brand: BrandSeoRef | null;
	category: CategorySeoRef | null;
	settings: SeoSettings;
	seo?: SeoMeta;
	factsContext?: ProductSeoFactsContext;
}): ResolvedSeoMeta {
	const storeName = resolveStoreName(settings);
	const facts = buildProductSeoFacts(product, storeName, factsContext, category?.label ?? "");
	const path = `/${product.categorySlug}/${product.slug}`;
	const heroImage = product.images[0]?.variants?.detail ?? "";
	const derivedTitle = buildProductSeoTitle(facts);
	const derivedDescription = buildProductSeoDescription(facts);
	const usesDefaultTitleTemplate = settings.titleTemplate.trim() === DEFAULT_PRODUCT_TITLE_TEMPLATE;

	return {
		title: seo?.title?.trim()
			? seo.title.trim()
			: usesDefaultTitleTemplate
				? derivedTitle
				: resolveTitle(undefined, facts.baseTitle, settings, buildProductTitleTemplateVars(facts)),
		description: resolveDescription(seo?.description, derivedDescription, settings.defaultDescription),
		canonical: resolveCanonical(seo?.canonicalUrl, path, settings.siteUrl),
		ogImageUrl: resolveOgImage(seo?.ogImageUrl, heroImage, settings.defaultOgImageUrl, settings.siteUrl),
		twitterCard: heroImage || settings.defaultOgImageUrl ? "summary_large_image" : "summary",
		robots: buildRobotsDirective(seo),
	};
}

/**
 * Storefront PDP metadata policy (ban-safe + market-competitive):
 * - One indexable canonical per product (no query params).
 * - Aggregate title/description on the clean URL.
 * - Variant query URLs get specific share copy but `noindex,follow`.
 */
export function composeProductPageSeo({
	product,
	brand: _brand,
	category,
	settings,
	seo,
	factsContext,
	selectedVariant,
	hasVariantQueryParams,
}: {
	product: Product;
	brand: BrandSeoRef | null;
	category: CategorySeoRef | null;
	settings: SeoSettings;
	seo?: SeoMeta;
	factsContext?: ProductSeoFactsContext;
	selectedVariant: Variant | null;
	hasVariantQueryParams: boolean;
}): ResolvedSeoMeta {
	const path = `/${product.categorySlug}/${product.slug}`;
	const indexableCanonical = absoluteUrl(settings.siteUrl, path);
	const heroImage = product.images[0]?.variants?.detail ?? "";

	if (hasVariantQueryParams) {
		const storeName = resolveStoreName(settings);
		const variant = selectedVariant;
		const derivedTitle = variant
			? buildVariantSeoTitle(product, variant, storeName, factsContext)
			: buildProductSeoTitle(buildProductSeoFacts(product, storeName, factsContext, category?.label ?? ""));
		const derivedDescription = variant
			? buildVariantSeoDescription(product, variant, storeName, factsContext)
			: buildProductSeoDescription(buildProductSeoFacts(product, storeName, factsContext, category?.label ?? ""));
		const staffNoindex = seo?.noindex === true;
		return {
			title: seo?.title?.trim() || derivedTitle,
			description: resolveDescription(seo?.description, derivedDescription, settings.defaultDescription),
			canonical: indexableCanonical,
			ogImageUrl: resolveOgImage(seo?.ogImageUrl, heroImage, settings.defaultOgImageUrl, settings.siteUrl),
			twitterCard: heroImage || settings.defaultOgImageUrl ? "summary_large_image" : "summary",
			robots: staffNoindex ? buildRobotsDirective(seo) : "noindex,follow",
		};
	}

	const aggregate = composeProductSeo({
		product,
		variant: product.variants[0] ?? {
			id: "",
			gradeSlug: "",
			priceRupees: 0,
			quantity: 0,
			forceOutOfStock: false,
			attributes: {},
		},
		brand: _brand,
		category,
		settings,
		seo,
		factsContext,
	});

	return {
		...aggregate,
		canonical: seo?.canonicalUrl?.trim() ? aggregate.canonical : indexableCanonical,
	};
}

export function composeCategorySeo({ category, settings, seo }: { category: CategorySeoRef; settings: SeoSettings; seo?: SeoMeta }): ResolvedSeoMeta {
	const baseTitle = `Shop ${category.label}`;
	const path = `/${category.slug}`;
	const derivedDescription = category.description?.trim() || `Browse ${category.label.toLowerCase()} at ${resolveStoreName(settings)}.`;

	return {
		title: resolveTitle(seo?.title, baseTitle, settings, {
			categoryLabel: category.label,
		}),
		description: resolveDescription(seo?.description, derivedDescription, settings.defaultDescription),
		canonical: resolveCanonical(seo?.canonicalUrl, path, settings.siteUrl),
		ogImageUrl: resolveOgImage(seo?.ogImageUrl, undefined, settings.defaultOgImageUrl, settings.siteUrl),
		twitterCard: seo?.ogImageUrl || settings.defaultOgImageUrl ? "summary_large_image" : "summary",
		robots: buildRobotsDirective(seo),
	};
}

export function composeBrandSeo({ brand, settings, seo }: { brand: Brand; settings: SeoSettings; seo?: SeoMeta }): ResolvedSeoMeta {
	const baseTitle = brand.name;
	const path = `/?brand=${brand.slug}`;
	const derivedDescription = `${brand.name} products at ${resolveStoreName(settings)}.`;

	return {
		title: resolveTitle(seo?.title, baseTitle, settings, {
			brandName: brand.name,
		}),
		description: resolveDescription(seo?.description, derivedDescription, settings.defaultDescription),
		canonical: resolveCanonical(seo?.canonicalUrl, path, settings.siteUrl),
		ogImageUrl: resolveOgImage(seo?.ogImageUrl, undefined, settings.defaultOgImageUrl, settings.siteUrl),
		twitterCard: settings.defaultOgImageUrl ? "summary_large_image" : "summary",
		robots: buildRobotsDirective(seo),
	};
}

export function composeOfferSeo({ offer, settings, seo }: { offer: Offer; settings: SeoSettings; seo?: SeoMeta }): ResolvedSeoMeta {
	const baseTitle = offer.title;
	const path = `/deals#${offer.slug}`;
	const derivedDescription = offer.description;
	const bannerUrl = offer.bannerImage?.variants?.detail;

	return {
		title: resolveTitle(seo?.title, baseTitle, settings),
		description: resolveDescription(seo?.description, derivedDescription, settings.defaultDescription),
		canonical: resolveCanonical(seo?.canonicalUrl, path, settings.siteUrl),
		ogImageUrl: resolveOgImage(seo?.ogImageUrl, bannerUrl, settings.defaultOgImageUrl, settings.siteUrl),
		twitterCard: seo?.ogImageUrl || bannerUrl || settings.defaultOgImageUrl ? "summary_large_image" : "summary",
		robots: buildRobotsDirective(seo),
	};
}

export function composeHomeSeo({ settings, seo }: { settings: SeoSettings; seo?: SeoMeta }): ResolvedSeoMeta {
	const baseTitle = resolveStoreName(settings);
	const derivedDescription = settings.siteTagline;
	return {
		title: resolveTitle(seo?.title, baseTitle, settings),
		description: resolveDescription(seo?.description, derivedDescription, settings.defaultDescription),
		canonical: resolveCanonical(seo?.canonicalUrl, "/", settings.siteUrl),
		ogImageUrl: resolveOgImage(seo?.ogImageUrl, undefined, settings.defaultOgImageUrl, settings.siteUrl),
		twitterCard: settings.defaultOgImageUrl ? "summary_large_image" : "summary",
		robots: buildRobotsDirective(seo),
	};
}

export function composeGradeGlossarySeo({
	grade,
	categoryLabel,
	settings,
	seo,
}: {
	grade: { categorySlug: string; slug: string; label: string; notes: string };
	categoryLabel: string;
	settings: SeoSettings;
	seo?: SeoMeta;
}): ResolvedSeoMeta {
	const storeName = resolveStoreName(settings);
	const path = `/grades/${grade.categorySlug}/${grade.slug}`;
	const derivedTitle = buildGradeGlossaryTitle(grade.label, storeName);
	const derivedDescription = buildGradeGlossaryDescription({
		gradeLabel: grade.label,
		gradeNotes: grade.notes,
		categoryLabel,
		storeName,
	});

	return {
		title: seo?.title?.trim() ? seo.title.trim() : derivedTitle,
		description: resolveDescription(seo?.description, derivedDescription, settings.defaultDescription),
		canonical: resolveCanonical(seo?.canonicalUrl, path, settings.siteUrl),
		ogImageUrl: resolveOgImage(seo?.ogImageUrl, undefined, settings.defaultOgImageUrl, settings.siteUrl),
		twitterCard: settings.defaultOgImageUrl ? "summary_large_image" : "summary",
		robots: buildRobotsDirective(seo),
	};
}

export function composeAttributeGlossarySeo({
	attribute,
	categoryLabel,
	settings,
	seo,
}: {
	attribute: { categorySlug: string; slug: string; label: string; unit?: string; optionLabels: string[] };
	categoryLabel: string;
	settings: SeoSettings;
	seo?: SeoMeta;
}): ResolvedSeoMeta {
	const storeName = resolveStoreName(settings);
	const path = `/attributes/${attribute.categorySlug}/${attribute.slug}`;
	const derivedTitle = buildAttributeGlossaryTitle(attribute.label, storeName);
	const derivedDescription = buildAttributeGlossaryDescription({
		attributeLabel: attribute.label,
		optionLabels: attribute.optionLabels,
		unit: attribute.unit,
		categoryLabel,
		storeName,
	});

	return {
		title: seo?.title?.trim() ? seo.title.trim() : derivedTitle,
		description: resolveDescription(seo?.description, derivedDescription, settings.defaultDescription),
		canonical: resolveCanonical(seo?.canonicalUrl, path, settings.siteUrl),
		ogImageUrl: resolveOgImage(seo?.ogImageUrl, undefined, settings.defaultOgImageUrl, settings.siteUrl),
		twitterCard: settings.defaultOgImageUrl ? "summary_large_image" : "summary",
		robots: buildRobotsDirective(seo),
	};
}

export function composeIntentSurfaceSeo({
	surface,
	settings,
	isIndexable,
}: {
	surface: {
		key: IntentSurfaceKey;
		title: string;
		description: string;
		canonicalQuery: string;
	};
	settings: SeoSettings;
	isIndexable: boolean;
}): ResolvedSeoMeta {
	const path = `/${surface.key.categorySlug}${surface.canonicalQuery}`;

	return {
		title: surface.title,
		description: truncateDescription(surface.description),
		canonical: absoluteUrl(settings.siteUrl, path),
		ogImageUrl: resolveOgImage(undefined, undefined, settings.defaultOgImageUrl, settings.siteUrl),
		twitterCard: settings.defaultOgImageUrl ? "summary_large_image" : "summary",
		robots: isIndexable ? "index,follow" : "noindex,follow",
	};
}
