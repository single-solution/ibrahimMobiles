import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeCategoryComingSoon } from "@/app/_components/home/HomeCategoryComingSoon";
import { HomeCompactBanner } from "@/app/_components/home/HomeCompactBanner";
import { HomeSearchResults } from "@/app/_components/home/HomeSearchResults";
import { HomeStorefrontFallback } from "@/app/_components/home/homeStorefrontFallbacks";
import { HomeScrollReset } from "@/app/_components/home/HomeScrollReset";
import { parseFiltersFromSearchParams, type CategoryMeta, type ProductPage } from "@/lib/core";
import {
	getCategoriesCached,
	getCategoryBySlugCached,
	getProductsPageCached,
	getStoreSettingsCached,
} from "@/lib/core/cached";
import { composeCategorySeo } from "@/lib/seo/composeSeoMeta";
import { getSeoSettings } from "@/lib/seo/seoSettings";
import {
	breadcrumbJsonLd,
	collectionPageJsonLd,
	jsonLdScriptContent,
} from "@/lib/seo/jsonLd";
import { logger } from "@store/shared";

const LISTING_PAGE_SIZE = 24;
const CATEGORY_PARAM = "category";

interface HomePageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
	const rawSearchParams = await searchParams;
	const searchQuery = readSearchQuery(rawSearchParams);

	if (searchQuery) {
		const { siteName } = await getStoreSettingsCached();
		return {
			title: `Search: ${searchQuery}`,
			description: `Search results for "${searchQuery}" at ${siteName}.`,
		};
	}

	const rawCategory = rawSearchParams[CATEGORY_PARAM];
	const categorySlug = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;
	if (!categorySlug?.trim()) {
		const { siteName } = await getStoreSettingsCached();
		return {
			title: siteName,
			description: `Browse ${siteName}. Every item graded by condition.`,
		};
	}

	const meta = await getCategoryBySlugCached(categorySlug.trim());
	if (!meta) {
		return { title: "Browse" };
	}

	const seoSettings = await getSeoSettings();
	const resolved = composeCategorySeo({
		category: {
			slug: meta.slug,
			label: meta.label,
			description: meta.description,
		},
		settings: seoSettings,
	});

	const categories = await getCategoriesCached();
	const homeCategorySlug = categories.find((category) => category.isActive)?.slug;
	const canonical =
		meta.slug === homeCategorySlug
			? seoSettings.siteUrl
			: `${seoSettings.siteUrl}/?category=${meta.slug}`;

	return {
		title: resolved.title,
		description: resolved.description,
		alternates: { canonical },
		robots: resolved.robots,
		openGraph: {
			title: resolved.title,
			description: resolved.description,
			url: canonical,
			type: "website",
			images: resolved.ogImageUrl ? [resolved.ogImageUrl] : undefined,
		},
		twitter: {
			card: resolved.twitterCard,
			title: resolved.title,
			description: resolved.description,
			images: resolved.ogImageUrl ? [resolved.ogImageUrl] : undefined,
		},
	};
}

export default function HomePage({ searchParams }: HomePageProps) {
	return (
		<div className="pb-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom,0px)+1rem)] md:pb-16">
			<Suspense fallback={<HomeStorefrontFallback />}>
				<HomeStorefront searchParams={searchParams} />
			</Suspense>
		</div>
	);
}

async function HomeStorefront({ searchParams }: HomePageProps) {
	const rawSearchParams = await searchParams;
	const searchQuery = readSearchQuery(rawSearchParams);

	if (searchQuery) {
		return (
			<HomeSearchResults
				query={searchQuery}
				requestedPage={normalisePage(rawSearchParams.page)}
			/>
		);
	}

	const [categories, settings] = await Promise.all([
		getCategoriesCached(),
		getStoreSettingsCached(),
	]);

	const homeCategory = categories.find((category) => category.isActive);
	if (!homeCategory) {
		return (
			<div className="mx-auto max-w-lg px-6 py-24 text-center">
				<p className="text-sm text-[var(--color-ink-600)]">No categories are available yet.</p>
			</div>
		);
	}

	const activeCategory = resolveCategory(categories, rawSearchParams, homeCategory);

	if (!activeCategory.isActive) {
		return (
			<>
				<HomeCompactBanner settings={settings} />
				<HomeCategoryComingSoon meta={activeCategory} />
			</>
		);
	}

	const filters = parseFiltersFromSearchParams(rawSearchParams, {
		categorySlug: activeCategory.slug,
	});

	let productPage: ProductPage = {
		products: [],
		total: 0,
		page: 1,
		pageSize: LISTING_PAGE_SIZE,
		pageCount: 1,
	};
	try {
		productPage = await getProductsPageCached(filters);
	} catch (error) {
		logger.error({ error }, "home: storefront product load failed");
	}

	return (
		<>
			<Suspense fallback={null}>
				<HomeScrollReset />
			</Suspense>
			<Suspense fallback={null}>
				<CategoryJsonLd meta={activeCategory} productPage={productPage} />
			</Suspense>
			<HomeCompactBanner settings={settings} />
		</>
	);
}

async function CategoryJsonLd({
	meta,
	productPage,
}: {
	meta: CategoryMeta;
	productPage: ProductPage;
}) {
	const [seoSettings, categories] = await Promise.all([getSeoSettings(), getCategoriesCached()]);
	const homeCategorySlug = categories.find((category) => category.isActive)?.slug;
	const collectionLd = collectionPageJsonLd({
		category: { slug: meta.slug, label: meta.label },
		products: productPage.products,
		settings: seoSettings,
	});
	const categoryUrl =
		meta.slug === homeCategorySlug
			? seoSettings.siteUrl
			: `${seoSettings.siteUrl}/?category=${meta.slug}`;
	const breadcrumbLd = breadcrumbJsonLd([
		{ name: "Home", url: seoSettings.siteUrl },
		{ name: meta.label, url: categoryUrl },
	]);

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(collectionLd) }}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(breadcrumbLd) }}
			/>
		</>
	);
}

function resolveCategory(
	categories: CategoryMeta[],
	rawSearchParams: Record<string, string | string[] | undefined>,
	homeCategory: CategoryMeta,
): CategoryMeta {
	const rawCategory = rawSearchParams[CATEGORY_PARAM];
	const requestedSlug = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;
	if (requestedSlug?.trim()) {
		const match = categories.find((category) => category.slug === requestedSlug.trim());
		if (match) {
			return match;
		}
	}

	return homeCategory;
}

function readSearchQuery(
	rawSearchParams: Record<string, string | string[] | undefined>,
): string {
	const raw = rawSearchParams.q ?? rawSearchParams.query;
	const value = Array.isArray(raw) ? raw[0] : raw;
	return (value ?? "").trim().slice(0, 100);
}

function normalisePage(value: string | string[] | undefined): number {
	const raw = Array.isArray(value) ? value[0] : value;
	const parsed = Number.parseInt(raw ?? "", 10);
	return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}
