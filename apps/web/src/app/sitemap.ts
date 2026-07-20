/**
 * Dynamic sitemap.
 *
 * We list:
 *   - Static marketing routes (home, deals, account sign-in, etc.).
 *   - Each active category landing page.
 *   - Quality-gated category x brand x grade intent surfaces.
 *   - Each visible product page (capped to MAX_PRODUCT_URLS so a runaway DB
 *     doesn't blow the 50 k entry sitemap limit). When we eventually need
 *     more, split into per-category sitemaps via `generateSitemaps`.
 *
 * Cached by Next at the edge based on the page's revalidation policy.
 *
 * Build-time resilience: the dynamic portion (categories/brands/products)
 * is wrapped in a single try/catch so that if Mongo is unreachable during
 * `next build` — typical on Vercel when Atlas blocks the build sandbox's
 * IP — we still emit a valid sitemap containing the static marketing URLs
 * instead of failing the entire build. The first runtime revalidation
 * (≤ 1h later) will populate the full sitemap.
 */
import type { MetadataRoute } from "next";

import { logger } from "@store/shared";

import { buildIntentSurfaceCanonicalQuery } from "@store/shared";

import { getStorefrontBaseUrl } from "@/lib/core/baseUrl";
import {
	getCategoriesCached,
	getSitemapAttributesCached,
	getSitemapGradesCached,
	getSitemapIntentSurfacesCached,
	getSitemapProductsCached,
} from "@/lib/core/cached";
import { attributeGlossaryHref, gradeGlossaryHref } from "@/lib/catalog/glossaryPaths";

export const revalidate = 3600;

const STATIC_PATHS: ReadonlyArray<{
	path: string;
	changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
	priority: number;
}> = [
	{ path: "/", changeFrequency: "daily", priority: 1.0 },
	{ path: "/deals", changeFrequency: "daily", priority: 0.9 },
	{ path: "/account/sign-in", changeFrequency: "yearly", priority: 0.3 },
];

interface DynamicSitemapData {
	categories: Awaited<ReturnType<typeof getCategoriesCached>>;
	products: Array<{ slug: string; categorySlug: string; updatedAt?: Date }>;
	grades: Array<{ categorySlug: string; slug: string; updatedAt?: Date }>;
	attributes: Array<{ categorySlug: string; slug: string; updatedAt?: Date }>;
	intentSurfaces: Awaited<ReturnType<typeof getSitemapIntentSurfacesCached>>;
}

async function loadDynamicData(): Promise<DynamicSitemapData | null> {
	try {
		const [categories, products, grades, attributes, intentSurfaces] = await Promise.all([
			getCategoriesCached(),
			getSitemapProductsCached(),
			getSitemapGradesCached(),
			getSitemapAttributesCached(),
			getSitemapIntentSurfacesCached(),
		]);
		return { categories, products, grades, attributes, intentSurfaces };
	} catch (error) {
		logger.error({ error }, "sitemap: dynamic load failed, emitting static-only sitemap this generation");
		return null;
	}
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = await getStorefrontBaseUrl();
	const now = new Date();

	const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((staticPath) => ({
		url: `${base}${staticPath.path}`,
		lastModified: now,
		changeFrequency: staticPath.changeFrequency,
		priority: staticPath.priority,
	}));

	const data = await loadDynamicData();
	if (!data) {
		return entries;
	}

	const { categories, products, grades, attributes, intentSurfaces } = data;
	const activeCategorySlugs = new Set(categories.filter((c) => c.isActive).map((c) => c.slug));

	for (const category of categories) {
		if (!category.isActive) {
			continue;
		}
		entries.push({
			url: `${base}/${category.slug}`,
			lastModified: now,
			changeFrequency: "daily",
			priority: 0.8,
		});
	}

	for (const combo of intentSurfaces) {
		if (!activeCategorySlugs.has(combo.categorySlug)) {
			continue;
		}
		const query = buildIntentSurfaceCanonicalQuery(combo.brandSlug, combo.gradeSlug);
		entries.push({
			url: `${base}/${combo.categorySlug}${query}`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 0.65,
		});
	}

	for (const product of products) {
		if (!activeCategorySlugs.has(product.categorySlug)) {
			continue;
		}
		entries.push({
			url: `${base}/${product.categorySlug}/${product.slug}`,
			lastModified: product.updatedAt ?? now,
			changeFrequency: "weekly",
			priority: 0.7,
		});
	}

	for (const grade of grades) {
		if (!activeCategorySlugs.has(grade.categorySlug)) {
			continue;
		}
		entries.push({
			url: `${base}${gradeGlossaryHref(grade.categorySlug, grade.slug)}`,
			lastModified: grade.updatedAt ?? now,
			changeFrequency: "monthly",
			priority: 0.5,
		});
	}

	for (const attribute of attributes) {
		if (!activeCategorySlugs.has(attribute.categorySlug)) {
			continue;
		}
		entries.push({
			url: `${base}${attributeGlossaryHref(attribute.categorySlug, attribute.slug)}`,
			lastModified: attribute.updatedAt ?? now,
			changeFrequency: "monthly",
			priority: 0.5,
		});
	}

	return entries;
}
