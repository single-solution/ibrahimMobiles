import Link from "next/link";

import { logger } from "@store/shared";

import { ShopProductFeed } from "@/components/shared/ShopProductFeed";
import { getProductsPageCached } from "@/lib/core/cached";

const SEARCH_PAGE_SIZE = 24;

interface HomeSearchResultsProps {
	query: string;
	requestedPage: number;
}

export async function HomeSearchResults({ query, requestedPage }: HomeSearchResultsProps) {
	let page: Awaited<ReturnType<typeof getProductsPageCached>>;
	try {
		page = await getProductsPageCached({
			search: query,
			limit: SEARCH_PAGE_SIZE,
			page: requestedPage,
			sort: "newest",
		});
	} catch (error) {
		logger.error({ error, query }, "home: search results load failed, rendering empty state");
		page = { products: [], total: 0, page: 1, pageSize: SEARCH_PAGE_SIZE, pageCount: 1 };
	}

	return (
		<div className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 md:pb-16 md:pt-10 lg:px-8">
			<div className="reveal max-w-2xl">
				<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-700)]">
					Search
				</p>
				<h1 className="mt-2 font-headline text-page-title font-semibold text-[var(--color-ink-900)]">
					Results for &ldquo;{query}&rdquo;
				</h1>
				<p className="mt-3 text-sm text-[var(--color-ink-500)]">
					Use the header search for instant suggestions, or open any result below.
				</p>
			</div>

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
				<div className="reveal mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface-muted)] px-5 py-12 text-center">
					<p className="text-sm font-semibold text-[var(--color-ink-900)]">No matching products found.</p>
					<Link
						href="/"
						className="tap mt-4 inline-flex rounded-[var(--radius-full)] bg-[var(--color-accent-500)] px-4 py-2 text-sm font-semibold text-[var(--color-ink-900)] hover:bg-[var(--color-accent-600)]"
					>
						Browse all products
					</Link>
				</div>
			)}
		</div>
	);
}
