import type { Metadata } from "next";
import Link from "next/link";

import { getStoreSettings } from "@store/db";

import { ProductCard } from "@/components/shared/ProductCard";
import { ResultsCountBar } from "@/components/shared/ResultsCountBar";
import { ShopPagination } from "@/components/shared/ShopPagination";
import { getStorefrontProductsPageCached } from "@/lib/storefront/cached";

const SEARCH_PAGE_SIZE = 24;

/**
 * Search results lean on `getStorefrontProductsPageCached` (60s TTL) and
 * the underlying catalog tag — the actual query is fast. Pinning the
 * page itself at 60s ISR lets repeat searches and back-nav into a
 * recent query hit the CDN/edge cache instead of rebuilding the RSC
 * payload on every visit.
 */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    title: "Search",
    description: `Search products available at ${settings.siteName}.`,
  };
}

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = normaliseQuery(params.q ?? params.query);
  const requestedPage = normalisePage(params.page);
  const page = query
    ? await getStorefrontProductsPageCached({
        search: query,
        limit: SEARCH_PAGE_SIZE,
        page: requestedPage,
        sort: "newest",
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <div className="reveal max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-700)]">
          Search
        </p>
        <h1 className="mt-2 font-headline text-page-title font-semibold text-[var(--color-ink-900)]">
          {query ? `Results for "${query}"` : "Search the shop"}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-ink-500)]">
          Use the header search for instant suggestions, or open any result
          below to continue shopping.
        </p>
      </div>

      {!query ? (
        <EmptySearchState message="Enter a search term from the header search box." />
      ) : page && page.products.length > 0 ? (
        <>
          <ResultsCountBar total={page.total} page={page.page} pageSize={page.pageSize} />
          <section className="reveal-stagger cv-auto-lg mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {page.products.map((product, index) => (
              // First two cards preload as priority (mobile LCP row) and stay
              // visible immediately; the rest spring/cascade in on scroll.
              <div key={product.id} className={index < 2 ? "h-full" : "reveal h-full"}>
                <ProductCard product={product} priority={index < 2} />
              </div>
            ))}
          </section>
          <ShopPagination page={page.page} pageCount={page.pageCount} basePath="/search" />
        </>
      ) : (
        <EmptySearchState message="No matching products found." />
      )}
    </div>
  );
}

function EmptySearchState({ message }: { message: string }) {
  return (
    <div className="reveal mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface-muted)] px-5 py-12 text-center">
      <p className="text-sm font-semibold text-[var(--color-ink-900)]">
        {message}
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
