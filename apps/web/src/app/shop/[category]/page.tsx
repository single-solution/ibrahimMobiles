import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cable, Gamepad2, Smartphone } from "lucide-react";
import type { ComponentType } from "react";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { FilterSidebar } from "@/components/shared/FilterSidebar";
import { SortDropdown } from "@/components/shared/SortDropdown";
import { ResultsCountBar } from "@/components/shared/ResultsCountBar";
import { ShopPagination } from "@/components/shared/ShopPagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { classNames, type Product, type ProductCategory } from "@store/shared";
import { parseFiltersFromSearchParams, type StorefrontProductFilters } from "@/lib/storefront";
import {
  getStorefrontBrandsCached,
  getStorefrontCategoriesCached,
  getStorefrontCategoryByPathSegmentCached,
  getStorefrontProductCountsByCategoryCached,
  getStorefrontProductsPageCached,
} from "@/lib/storefront/cached";

// ISR on a 60s window: catalog edits from the admin propagate within a
// minute, but customers don't pay the cost of a 30-stage aggregation on
// every click. Mutations that need instant propagation should call
// `revalidateTag(STOREFRONT_CACHE_TAG)` from the admin server action.
export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const MOBILE_SKELETON_CARDS = 6;
const DESKTOP_SKELETON_CARDS = 12;
const FILTER_GROUP_COUNT = 3;
const FILTER_ROWS_PER_GROUP = 4;

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  // React `cache()` makes this call free if the page body already ran it
  // for the same `category`, or vice versa — one DB lookup per render.
  const meta = await getStorefrontCategoryByPathSegmentCached(category);
  if (!meta) {
    return { title: "Shop" };
  }
  return {
    title: `Shop ${meta.pluralLabel}`,
    description: meta.tagline,
  };
}

/**
 * Category listing page.
 *
 * Render strategy (static-first):
 *   1. Resolve `params` + look up the category meta — both required
 *      before we know if this is even a valid page (notFound).
 *   2. Render the page chrome synchronously: mobile / desktop frames,
 *      sort dropdown, layout grids, section spacing.
 *   3. Each data-dependent block has its own `<Suspense>` boundary so
 *      it streams in independently:
 *        • CategorySelector — needs categories + per-category counts
 *        • FilterSidebar     — needs brand list
 *        • ProductGrid+Pagination — needs the heavy products aggregation
 *      All three boundaries paint as soon as their data lands, no
 *      ordering dependency between them.
 */
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ category }, rawSearchParams] = await Promise.all([params, searchParams]);
  const meta = await getStorefrontCategoryByPathSegmentCached(category);

  if (!meta) {
    notFound();
  }

  if (!meta.isActive) {
    return <ComingSoon segment={meta.pluralLabel} tagline={meta.tagline} />;
  }

  const filters = parseFiltersFromSearchParams(rawSearchParams, { category: meta.id });

  return (
    <>
      {/* Mobile only — native */}
      <div className="app-page pb-6 pt-4 md:hidden">
        <Suspense fallback={<CategorySelectorSkeleton />}>
          <CategorySelectorData active={meta.id} />
        </Suspense>

        <div className="mt-4 flex items-center gap-2">
          <Suspense
            fallback={<Skeleton shape="pill" className="h-10 w-24" />}
          >
            <FilterSidebarData category={meta.id} />
          </Suspense>
          <SortDropdown />
        </div>

        <Suspense fallback={<MobileProductsAreaSkeleton />}>
          <MobileProductsArea meta={meta} filters={filters} />
        </Suspense>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-[1440px] px-6 pb-16 pt-8 md:block">
        <div className="grid grid-cols-[260px_1fr] gap-8">
          <Suspense fallback={<DesktopFilterSidebarSkeleton />}>
            <FilterSidebarData category={meta.id} />
          </Suspense>

          <div className="space-y-6">
            <Suspense fallback={<CategorySelectorSkeleton />}>
              <CategorySelectorData active={meta.id} />
            </Suspense>

            <Suspense fallback={<DesktopProductsAreaSkeleton />}>
              <DesktopProductsArea meta={meta} filters={filters} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────── Data-bound async slots ─────────────────────── */

interface CategorySelectorDataProps {
  active: ProductCategory;
}

async function CategorySelectorData({ active }: CategorySelectorDataProps) {
  const [categories, countById] = await Promise.all([
    getStorefrontCategoriesCached(),
    getStorefrontProductCountsByCategoryCached(),
  ]);
  return <CategorySelector active={active} categories={categories} countById={countById} />;
}

interface FilterSidebarDataProps {
  category: ProductCategory;
}

async function FilterSidebarData({ category }: FilterSidebarDataProps) {
  const brands = await getStorefrontBrandsCached();
  return <FilterSidebar category={category} brands={brands} />;
}

interface ProductsAreaProps {
  meta: { id: ProductCategory; pluralLabel: string; pathSegment: string };
  filters: StorefrontProductFilters;
}

async function MobileProductsArea({ meta, filters }: ProductsAreaProps) {
  const page = await getStorefrontProductsPageCached(filters);
  return (
    <>
      <ResultsCountBar total={page.total} page={page.page} pageSize={page.pageSize} />
      <div className="app-section">
        <ProductGrid products={page.products} categoryLabel={meta.pluralLabel} />
      </div>
      <div className="app-section">
        <ShopPagination
          page={page.page}
          pageCount={page.pageCount}
          basePath={`/shop/${meta.pathSegment}`}
        />
      </div>
    </>
  );
}

async function DesktopProductsArea({ meta, filters }: ProductsAreaProps) {
  const page = await getStorefrontProductsPageCached(filters);
  return (
    <>
      <div className="flex items-center justify-between">
        <ResultsCountBar
          total={page.total}
          page={page.page}
          pageSize={page.pageSize}
          hideOnMobile
        />
        <SortDropdown />
      </div>
      <ProductGrid products={page.products} categoryLabel={meta.pluralLabel} />
      <ShopPagination
        page={page.page}
        pageCount={page.pageCount}
        basePath={`/shop/${meta.pathSegment}`}
      />
    </>
  );
}

/* ─────────────────────── Suspense fallbacks ─────────────────────── */

function CategorySelectorSkeleton() {
  return (
    <div className="grid grid-cols-3 items-start gap-2 md:gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3 md:items-start md:gap-3 md:p-4"
        >
          <Skeleton className="size-[18px] shrink-0 md:size-[22px]" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Skeleton shape="text" className="h-3.5 w-20 md:h-4 md:w-24" />
              <Skeleton shape="text" className="h-3 w-8 shrink-0" />
            </div>
            <Skeleton shape="text" className="hidden h-3 w-3/4 md:block" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DesktopFilterSidebarSkeleton() {
  return (
    <aside className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5">
      {Array.from({ length: FILTER_GROUP_COUNT }).map((_, groupIndex) => (
        <div key={groupIndex} className="space-y-3">
          <Skeleton shape="text" className="h-3 w-24" />
          <div className="space-y-2">
            {Array.from({ length: FILTER_ROWS_PER_GROUP }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-2">
                <Skeleton className="size-4 shrink-0" />
                <Skeleton shape="text" className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function MobileProductsAreaSkeleton() {
  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton shape="text" className="h-3 w-20" />
      </div>
      <div className="app-section">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {Array.from({ length: MOBILE_SKELETON_CARDS }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
      <div className="app-section">
        <PaginationSkeleton />
      </div>
    </>
  );
}

function DesktopProductsAreaSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between">
        <Skeleton shape="text" className="h-4 w-40" />
        <Skeleton shape="pill" className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-3 gap-5 xl:grid-cols-4">
        {Array.from({ length: DESKTOP_SKELETON_CARDS }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
      <PaginationSkeleton />
    </>
  );
}

function PaginationSkeleton() {
  return (
    <nav className="flex items-center justify-center gap-1.5">
      <Skeleton shape="pill" className="h-9 w-9" />
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} shape="pill" className="h-9 w-9" />
      ))}
      <Skeleton shape="pill" className="h-9 w-9" />
    </nav>
  );
}

/* ─────────────────────── Static, data-free pieces ─────────────────────── */

/**
 * Top-of-page category selector — replaces both the slim pill row and the
 * standalone `/shop` landing. Each card represents one of the three
 * storefront categories. The active card is highlighted in accent; the
 * others are clickable to switch sections without leaving the listing.
 * Categories flagged `isActive: false` render as a disabled tile with
 * "Coming soon" copy instead of being clickable.
 */
const CATEGORY_ICON: Record<
  ProductCategory,
  ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
> = {
  phone: Smartphone,
  accessory: Cable,
  gadget: Gamepad2,
};

interface CategorySelectorProps {
  active: ProductCategory;
  categories: { id: ProductCategory; pluralLabel: string; tagline: string; isActive: boolean; pathSegment: string }[];
  countById: Map<ProductCategory, number>;
}

function CategorySelector({ active, categories, countById }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-3 items-start gap-2 md:gap-4">
      {categories.map((meta) => {
        const isActive = meta.id === active;
        const isAvailable = meta.isActive;
        const Icon = CATEGORY_ICON[meta.id];
        const count = countById.get(meta.id) ?? 0;

        const inner = (
          <div
            className={classNames(
              "tap relative flex items-center gap-2.5 rounded-[var(--radius-lg)] border p-3 transition-colors md:items-start md:gap-3 md:p-4",
              isActive
                ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] shadow-[var(--shadow-sm)]"
                : isAvailable
                  ? "border-[var(--color-ink-100)] bg-[var(--color-surface)] hover:border-[var(--color-ink-200)]"
                  : "cursor-not-allowed border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 opacity-70",
            )}
          >
            <Icon
              size={18}
              strokeWidth={2}
              className={classNames(
                "shrink-0 md:mt-0.5 md:size-[22px]",
                isActive
                  ? "text-[var(--color-accent-700)]"
                  : "text-[var(--color-ink-700)]",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={classNames(
                    "truncate text-[13px] font-semibold tracking-tight md:text-[16px]",
                    isActive
                      ? "text-[var(--color-accent-800)]"
                      : "text-[var(--color-ink-900)]",
                  )}
                >
                  {meta.pluralLabel}
                </p>
                <span
                  className={classNames(
                    "shrink-0 text-[11px] font-semibold tabular-nums md:text-[12.5px]",
                    isAvailable
                      ? isActive
                        ? "text-[var(--color-accent-700)]"
                        : "text-[var(--color-ink-500)]"
                      : "text-[10px] uppercase tracking-[0.08em] text-[var(--color-ink-400)] md:text-[10.5px]",
                  )}
                >
                  {isAvailable ? count : "Soon"}
                </span>
              </div>
              <p className="mt-0.5 hidden text-[12px] leading-snug text-[var(--color-ink-600)] md:line-clamp-2 md:block">
                {meta.tagline}
              </p>
            </div>
          </div>
        );

        if (!isAvailable) {
          return (
            <div key={meta.id} aria-disabled>
              {inner}
            </div>
          );
        }
        return (
          <Link
            key={meta.id}
            href={`/shop/${meta.pathSegment}`}
            scroll={false}
            className="block focus:outline-none"
            aria-current={isActive ? "page" : undefined}
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}

interface ProductGridProps {
  products: Product[];
  categoryLabel: string;
}

function ProductGrid({ products: productList, categoryLabel }: ProductGridProps) {
  if (productList.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 p-10 text-center text-[13px] text-[var(--color-ink-500)]">
        No {categoryLabel.toLowerCase()} match these filters — try clearing a few.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
      {productList.map((product) => (
        <div key={product.id} className="reveal">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

function ComingSoon({ segment, tagline }: { segment: string; tagline: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-16 text-center md:pt-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)]">
        Coming soon
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink-900)] md:text-4xl">
        {segment}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[var(--color-ink-600)]">
        {tagline}
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-flex items-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-ink-300)]"
      >
        Browse other shops →
      </Link>
    </div>
  );
}
