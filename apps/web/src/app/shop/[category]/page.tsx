import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { classNames, normalizeStructuredContent } from "@store/shared";

import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { ShopProductGrid } from "@/components/shared/ShopProductGrid";
import { FilterSidebar } from "@/components/shared/FilterSidebar";
import { LucideIconRenderer } from "@/components/shared/LucideIconRenderer";
import {
  StructuredContentCompact,
  StructuredContentFull,
} from "@/components/shared/StructuredContent";
import { SortDropdown } from "@/components/shared/SortDropdown";
import { ResultsCountBar } from "@/components/shared/ResultsCountBar";
import { ShopPagination } from "@/components/shared/ShopPagination";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  parseFiltersFromSearchParams,
  type StorefrontCategory,
  type StorefrontProductFilters,
} from "@/lib/storefront";
import { getStorefrontFacets } from "@/lib/storefront/facets";
import {
  getStorefrontBrandsCached,
  getStorefrontGradeCountsCached,
  getStorefrontCategoriesCached,
  getStorefrontCategoryBySlugCached,
  getStorefrontProductsPageCached,
} from "@/lib/storefront/cached";
import { composeCategorySeo } from "@/lib/seo/composeSeoMeta";
import { getSeoSettings } from "@/lib/seo/seoSettings";
import {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  jsonLdScriptContent,
} from "@/lib/seo/jsonLd";

/**
 * Category listing page.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - The URL contract is `/shop/<categorySlug>` — admin-authored slug
 *     is the URL segment (no separate `pathSegment` field).
 *   - The "category selector" rail just lists every active category by
 *     slug — no hardcoded phone/accessory/gadget icon table.
 *   - Per-category product counts come from the same paged aggregation
 *     used to render the listing (filtered by `categorySlug`) — no
 *     separate "counts by category" lookup is needed.
 */

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
  const meta = await getStorefrontCategoryBySlugCached(category);
  if (!meta) {
    return { title: "Shop" };
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
  return {
    title: resolved.title,
    description: resolved.description,
    alternates: { canonical: resolved.canonical },
    robots: resolved.robots,
    openGraph: {
      title: resolved.title,
      description: resolved.description,
      url: resolved.canonical,
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

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ category }, rawSearchParams] = await Promise.all([params, searchParams]);
  const meta = await getStorefrontCategoryBySlugCached(category);

  if (!meta) {
    notFound();
  }

  if (!meta.isActive) {
    return <ComingSoon meta={meta} />;
  }

  const filters = parseFiltersFromSearchParams(rawSearchParams, {
    categorySlug: meta.slug,
  });

  return (
    <>
      <Suspense fallback={null}>
        <CategoryJsonLd meta={meta} filters={filters} />
      </Suspense>
      {/* Mobile only — native */}
      <div className="app-page pb-6 pt-4 md:hidden">
        <Suspense fallback={<CategorySelectorSkeleton />}>
          <CategorySelectorData activeSlug={meta.slug} />
        </Suspense>

        <div className="mt-4 flex items-center gap-2">
          <Suspense fallback={<Skeleton shape="pill" className="h-10 w-24" />}>
            <FilterSidebarData categorySlug={meta.slug} filters={filters} />
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
            <FilterSidebarData categorySlug={meta.slug} filters={filters} />
          </Suspense>

          <div className="space-y-6">
            <Suspense fallback={<CategorySelectorSkeleton />}>
              <CategorySelectorData activeSlug={meta.slug} />
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

/* ──────────────────────────── JSON-LD slot ──────────────────────────── */

interface CategoryJsonLdProps {
  meta: StorefrontCategory;
  filters: StorefrontProductFilters;
}

async function CategoryJsonLd({ meta, filters }: CategoryJsonLdProps) {
  const [page, seoSettings] = await Promise.all([
    getStorefrontProductsPageCached(filters),
    getSeoSettings(),
  ]);
  const collectionLd = collectionPageJsonLd({
    category: { slug: meta.slug, label: meta.label },
    products: page.products,
    settings: seoSettings,
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: seoSettings.siteUrl },
    { name: "Shop", url: `${seoSettings.siteUrl}/shop` },
    { name: meta.label, url: `${seoSettings.siteUrl}/shop/${meta.slug}` },
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

/* ─────────────────────── Async RSC section loaders ─────────────────────── */

interface CategorySelectorDataProps {
  activeSlug: string;
}

async function CategorySelectorData({ activeSlug }: CategorySelectorDataProps) {
  const categories = await getStorefrontCategoriesCached();
  return <CategorySelector activeSlug={activeSlug} categories={categories} />;
}

interface FilterSidebarDataProps {
  categorySlug: string;
  filters: StorefrontProductFilters;
}

async function FilterSidebarData({
  categorySlug,
  filters,
}: FilterSidebarDataProps) {
  const [brands, facets, gradeCounts] = await Promise.all([
    getStorefrontBrandsCached(categorySlug),
    getStorefrontFacets(filters),
    getStorefrontGradeCountsCached(categorySlug),
  ]);
  return (
    <FilterSidebar
      categorySlug={categorySlug}
      brands={brands}
      gradeCounts={gradeCounts}
      initialFacets={facets}
    />
  );
}

interface ProductsAreaProps {
  meta: StorefrontCategory;
  filters: StorefrontProductFilters;
}

async function MobileProductsArea({ meta, filters }: ProductsAreaProps) {
  const page = await getStorefrontProductsPageCached(filters);
  return (
    <>
      <ResultsCountBar total={page.total} page={page.page} pageSize={page.pageSize} />
      <div className="app-section">
        <ShopProductGrid products={page.products} categoryLabel={meta.label} />
      </div>
      {page.pageCount > 1 ? (
        <div className="app-section">
          <ShopPagination
            page={page.page}
            pageCount={page.pageCount}
            basePath={`/shop/${meta.slug}`}
          />
        </div>
      ) : null}
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
      <ShopProductGrid products={page.products} categoryLabel={meta.label} />
      <ShopPagination
        page={page.page}
        pageCount={page.pageCount}
        basePath={`/shop/${meta.slug}`}
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
            <Skeleton shape="text" className="h-3.5 w-20 md:h-4 md:w-24" />
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

interface CategorySelectorProps {
  activeSlug: string;
  categories: StorefrontCategory[];
}

function CategorySelector({ activeSlug, categories }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-3 items-start gap-2 md:gap-4">
      {categories.map((category) => {
        const isActive = category.slug === activeSlug;
        const isAvailable = category.isActive;
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
            <CategoryIcon category={category} isActive={isActive} />
            <div className="min-w-0 flex-1">
              <p
                className={classNames(
                  "truncate text-[13px] font-semibold tracking-tight md:text-[16px]",
                  isActive
                    ? "text-[var(--color-accent-800)]"
                    : "text-[var(--color-ink-900)]",
                )}
              >
                {category.label}
              </p>
              <StructuredContentCompact
                content={normalizeStructuredContent(
                  category.content,
                  category.description,
                )}
                fallback={category.description}
                clampLines={2}
                className="mt-0.5 hidden leading-snug text-[var(--color-ink-600)] md:line-clamp-2 md:block md:text-[12px]"
              />
            </div>
          </div>
        );

        if (!isAvailable) {
          return (
            <div key={category.slug} aria-disabled>
              {inner}
            </div>
          );
        }
        return (
          <Link
            key={category.slug}
            href={`/shop/${category.slug}`}
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

function CategoryIcon({
  category,
  isActive,
}: {
  category: StorefrontCategory;
  isActive: boolean;
}) {
  return (
    <LucideIconRenderer
      name={category.icon}
      size={22}
      strokeWidth={2.2}
      aria-hidden
      className={classNames(
        "shrink-0",
        isActive ? "opacity-100" : "opacity-90",
      )}
    />
  );
}

function ComingSoon({ meta }: { meta: StorefrontCategory }) {
  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-16 text-center md:pt-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)]">
        Coming soon
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink-900)] md:text-4xl">
        {meta.label}
      </h1>
      <StructuredContentFull
        content={meta.content}
        fallback={meta.description}
        iconColor="var(--color-accent-700)"
        iconSize={14}
        iconSizeClass="size-[14px]"
        className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[var(--color-ink-600)]"
        bulletItemClassName="justify-center text-[13.5px] text-[var(--color-ink-700)]"
      />
      <Link
        href="/shop"
        className="mt-6 inline-flex items-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-ink-300)]"
      >
        Browse other shops →
      </Link>
    </div>
  );
}
