import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logger } from "@store/shared";

import { ShopIntroHero } from "@/app/_components/shop/ShopIntroHero";
import { ShopProductFeed } from "@/components/shared/ShopProductFeed";
import { catalogRootHref, categoryHref } from "@/lib/catalog/productPaths";
import { getCategoriesCached, getProductsPageCached, getStoreSettingsCached } from "@/lib/core/cached";

/**
 * `/`
 *
 *   • `?q=<term>` present → render global search results here (search lives
 *     on the catalog root with the query in the `q` param — no separate route).
 *   • otherwise → redirect to the first active category (catalog sort order).
 */
export const revalidate = 300;

const SEARCH_PAGE_SIZE = 24;

interface CatalogIndexPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: CatalogIndexPageProps): Promise<Metadata> {
	const { siteName } = await getStoreSettingsCached();
	const query = normaliseQuery((await searchParams).q ?? (await searchParams).query);
	if (query) {
		return {
			title: `Search: ${query}`,
			description: `Search results for "${query}" at ${siteName}.`,
		};
	}
	return {
		title: "Shop",
		description: `Browse ${siteName} by category. Every item graded by condition.`,
	};
}

export default async function CatalogIndexPage({ searchParams }: CatalogIndexPageProps) {
	const params = await searchParams;
	const query = normaliseQuery(params.q ?? params.query);

	if (query) {
		return <CatalogSearchResults query={query} requestedPage={normalisePage(params.page)} />;
	}

	let categories: Awaited<ReturnType<typeof getCategoriesCached>> = [];
	try {
		categories = await getCategoriesCached();
	} catch (error) {
		logger.error({ error }, "catalog: categories load failed, rendering empty search fallback");
		return <CatalogSearchResults query="" requestedPage={1} />;
	}

	const firstActive = categories.find((category) => category.isActive);

	if (!firstActive) {
		return <CatalogSearchResults query="" requestedPage={1} />;
	}

	redirect(categoryHref(firstActive.slug));
}

async function CatalogSearchResults({ query, requestedPage }: { query: string; requestedPage: number }) {
	let page: Awaited<ReturnType<typeof getProductsPageCached>>;
	try {
		page = await getProductsPageCached({
			search: query,
			limit: SEARCH_PAGE_SIZE,
			page: requestedPage,
			sort: "newest",
		});
	} catch (error) {
		logger.error({ error, query }, "catalog: search results load failed, rendering empty state this render");
		page = { products: [], total: 0, page: 1, pageSize: SEARCH_PAGE_SIZE, pageCount: 1 };
	}

	return (
		<>
			<ShopIntroHero />
			<div className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-2 md:px-6 md:pb-16 md:pt-4 lg:px-8">
				{page.products.length > 0 ? (
					<div className="cv-auto-lg mt-4">
						<ShopProductFeed
							initialPage={page}
							categoryLabel="results"
							apiParams={{}}
							showResultsCount
							gridClassName="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4"
						/>
					</div>
				) : (
					<EmptySearchState />
				)}
			</div>
		</>
	);
}

function EmptySearchState() {
	return (
		<div className="reveal mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface-muted)] px-5 py-12 text-center">
			<p className="text-sm font-semibold text-[var(--color-ink-900)]">No matching products found.</p>
			<Link
				href={catalogRootHref()}
				className="tap mt-4 inline-flex rounded-[var(--radius-full)] bg-[var(--color-accent-500)] px-4 py-2 text-sm font-semibold text-[var(--color-ink-900)] hover:bg-[var(--color-accent-600)]"
			>
				Browse all products
			</Link>
		</div>
	);
}

function normaliseQuery(value: string | string[] | undefined): string {
	const raw = Array.isArray(value) ? value[0] : value;
	return (raw ?? "").trim().slice(0, 100);
}

function normalisePage(value: string | string[] | undefined): number {
	const raw = Array.isArray(value) ? value[0] : value;
	const parsed = Number.parseInt(raw ?? "", 10);
	return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}
