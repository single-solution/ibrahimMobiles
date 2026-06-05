import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logger } from "@store/shared";

import { ShopProductFeed } from "@/components/shared/ShopProductFeed";
import {
  getStoreSettingsCached,
  getCategoriesCached,
  getProductsPageCached,
} from "@/lib/core/cached";

/**
 * `/shop`
 *
 *   • `?q=<term>` present → render global search results here (search lives
 *     on the shop URL with the query in the `q` param — no separate route).
 *   • otherwise → redirect to the first active category (catalog sort order).
 */
export const revalidate = 300;

const FALLBACK_REDIRECT = "/";
const SEARCH_PAGE_SIZE = 24;

interface ShopIndexPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: ShopIndexPageProps): Promise<Metadata> {
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

export default async function ShopIndexPage({ searchParams }: ShopIndexPageProps) {
  const params = await searchParams;
  const query = normaliseQuery(params.q ?? params.query);

  if (query) {
    return <ShopSearchResults query={query} requestedPage={normalisePage(params.page)} />;
  }

  let categories: Awaited<ReturnType<typeof getCategoriesCached>> = [];
  try {
    categories = await getCategoriesCached();
  } catch (error) {
    logger.error(
      { error },
      `shop: categories load failed, redirecting to ${FALLBACK_REDIRECT}`,
    );
    redirect(FALLBACK_REDIRECT);
  }

  const firstActive = categories.find((category) => category.isActive);

  if (!firstActive) {
    redirect(FALLBACK_REDIRECT);
  }

  redirect(`/shop/${firstActive.slug}`);
}

async function ShopSearchResults({
  query,
  requestedPage,
}: {
  query: string;
  requestedPage: number;
}) {
  let page: Awaited<ReturnType<typeof getProductsPageCached>>;
  try {
    page = await getProductsPageCached({
      search: query,
      limit: SEARCH_PAGE_SIZE,
      page: requestedPage,
      sort: "newest",
    });
  } catch (error) {
    logger.error(
      { error, query },
      "shop: search results load failed, rendering empty state this render",
    );
    page = { products: [], total: 0, page: 1, pageSize: SEARCH_PAGE_SIZE, pageCount: 1 };
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <div className="reveal max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-700)]">
          Search
        </p>
        <h1 className="mt-2 font-headline text-page-title font-semibold text-[var(--color-ink-900)]">
          Results for &ldquo;{query}&rdquo;
        </h1>
        <p className="mt-3 text-sm text-[var(--color-ink-500)]">
          Use the header search for instant suggestions, or open any result
          below to continue shopping.
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
        <EmptySearchState />
      )}
    </div>
  );
}

function EmptySearchState() {
  return (
    <div className="reveal mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface-muted)] px-5 py-12 text-center">
      <p className="text-sm font-semibold text-[var(--color-ink-900)]">
        No matching products found.
      </p>
      <Link
        href="/shop"
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
