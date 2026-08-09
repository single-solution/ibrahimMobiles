import { cache } from "react";
import { aggregateIntentSurfaceComboStats } from "@store/db";
import {
	buildIntentSurfaceCanonicalQuery,
	buildIntentSurfaceFormulaDescription,
	buildIntentSurfaceFormulaHeadline,
	buildIntentSurfaceFormulaIntro,
	buildIntentSurfaceFormulaTitle,
	hasNonIndexableListingFilters,
	parseIndexableIntentSurface,
	passesIntentSurfaceEligibility,
	type IntentSurfaceKey,
} from "@store/shared";

import type { CategoryMeta, ProductFilters, PublicSeoSurface } from "@/lib/core/queries";
import { getBrandBySlugCached, getGradesCached, getSeoSurfaceCached } from "@/lib/core/cached";
import { composeIntentSurfaceSeo, type SeoSettings } from "@/lib/seo/composeSeoMeta";

export interface ResolvedIntentSurfacePage {
	key: IntentSurfaceKey;
	headline: string;
	intro: string;
	title: string;
	description: string;
	canonicalQuery: string;
	isIndexable: boolean;
	showHeader: boolean;
}

function buildFormulaSurface(input: {
	key: IntentSurfaceKey;
	brandName: string;
	category: CategoryMeta;
	gradeLabel: string;
	storeName: string;
	productCount: number;
	inStockVariantCount: number;
	minPriceRupees?: number;
	maxPriceRupees?: number;
}): Omit<PublicSeoSurface, "isIndexable"> {
	const { key, brandName, category, gradeLabel, storeName, productCount, inStockVariantCount, minPriceRupees, maxPriceRupees } = input;
	return {
		key,
		title: buildIntentSurfaceFormulaTitle({
			brandName,
			categoryLabel: category.label,
			gradeLabel,
			storeName,
		}),
		description: buildIntentSurfaceFormulaDescription({
			brandName,
			categoryLabel: category.label,
			gradeLabel,
			productCount,
			inStockVariantCount,
			minPriceRupees,
			maxPriceRupees,
			storeName,
		}),
		headline: buildIntentSurfaceFormulaHeadline({
			brandName,
			categoryLabel: category.label,
			gradeLabel,
		}),
		intro:
			buildIntentSurfaceFormulaIntro({
				brandName,
				categoryLabel: category.label,
				gradeLabel,
				productCount,
				storeName,
			}) ||
			category.description ||
			"",
		canonicalQuery: buildIntentSurfaceCanonicalQuery(key.brandSlug, key.gradeSlug),
		productCount,
		inStockVariantCount,
	};
}

export const resolveIntentSurfacePage = cache(async function resolveIntentSurfacePage({
	category,
	filters,
	rawSearchParams,
	seoSettings,
}: {
	category: CategoryMeta;
	filters: ProductFilters;
	rawSearchParams: Record<string, string | string[] | undefined>;
	seoSettings: SeoSettings;
}): Promise<ResolvedIntentSurfacePage | null> {
	const key = parseIndexableIntentSurface(rawSearchParams, category.slug);
	if (!key) {
		return null;
	}

	if (hasNonIndexableListingFilters(filters)) {
		return {
			key,
			headline: category.label,
			intro: category.description,
			title: category.label,
			description: category.description,
			canonicalQuery: buildIntentSurfaceCanonicalQuery(key.brandSlug, key.gradeSlug),
			isIndexable: false,
			showHeader: false,
		};
	}

	const storeName = seoSettings.seoStoreName.trim() || seoSettings.siteName;
	const [stored, brand, grades, liveStats] = await Promise.all([
		getSeoSurfaceCached(key.categorySlug, key.brandSlug, key.gradeSlug),
		getBrandBySlugCached(key.brandSlug, key.categorySlug),
		getGradesCached(),
		aggregateIntentSurfaceComboStats(key),
	]);

	const gradeLabel = grades.find((grade) => grade.categorySlug === key.categorySlug && grade.slug === key.gradeSlug)?.label ?? key.gradeSlug;
	const brandName = brand?.name ?? key.brandSlug;
	const stats = liveStats ?? { ...key, productCount: 0, inStockVariantCount: 0 };

	const formula = buildFormulaSurface({
		key,
		brandName,
		category,
		gradeLabel,
		storeName,
		productCount: stats.productCount,
		inStockVariantCount: stats.inStockVariantCount,
		minPriceRupees: stats.minPriceRupees,
		maxPriceRupees: stats.maxPriceRupees,
	});

	const surface = stored ?? formula;
	const categoryCopy = category.description?.trim() || "";
	const hasCopy = Boolean(surface.title && surface.description && (surface.intro.trim() || categoryCopy));
	const isIndexable = passesIntentSurfaceEligibility(stats, hasCopy);

	const resolved = composeIntentSurfaceSeo({
		surface: {
			key,
			title: surface.title,
			description: surface.description,
			canonicalQuery: surface.canonicalQuery || buildIntentSurfaceCanonicalQuery(key.brandSlug, key.gradeSlug),
		},
		settings: seoSettings,
		isIndexable,
	});

	return {
		key,
		headline: surface.headline || formula.headline,
		intro: surface.intro || formula.intro || category.description,
		title: resolved.title,
		description: resolved.description,
		canonicalQuery: surface.canonicalQuery || buildIntentSurfaceCanonicalQuery(key.brandSlug, key.gradeSlug),
		isIndexable,
		showHeader: true,
	};
}
