import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";

import type { Product } from "@store/shared";

import { GradeShowcase } from "@/components/shared/GradeShowcase";
import { VariantAwareGallery } from "@/components/shared/PdpGallery";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { VariantProvider } from "@/components/shared/VariantContext";
import { VariantSelector } from "@/components/shared/VariantSelector";
import {
  categoryAttributeSlugsFromProduct,
  readLegacyVariantId,
  resolveExactVariantFromSearch,
} from "@/lib/catalog/pdpSelection";
import { getDefaultVariant } from "@/lib/productSummary";
import {
  productAbsoluteUrl,
  productHref,
} from "@/lib/catalog/productPaths";
import { getStorefrontProducts } from "@/lib/storefront";
import {
  getStorefrontAttributesCached,
  getStorefrontBrandBySlugCached,
  getStorefrontCategoryBySlugCached,
  getStorefrontProductBySlugCached,
} from "@/lib/storefront/cached";
import { composeProductSeo } from "@/lib/seo/composeSeoMeta";
import { getSeoSettings } from "@/lib/seo/seoSettings";
import {
  breadcrumbJsonLd,
  jsonLdScriptContent,
  productJsonLd,
} from "@/lib/seo/jsonLd";

/**
 * Category-agnostic product detail page.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - One PDP serves every category. The previous per-category fork
 *     is gone — variants carry admin-defined `attributes` and `images`, so the
 *     single `<VariantSelector>` renders them all.
 *   - The URL contract is `/shop/<categorySlug>/<productSlug>` — the
 *     category slug *is* the URL segment (no separate `pathSegment`
 *     field anymore).
 *   - Phase 6 (Storefront PDP alignment) refines the layout per-category
 *     using `Category.heroLayout` settings. For Phase 1 the layout is
 *     a single template, kept intentionally lean.
 */

// Live pricing + stock change frequently — never cache the detail page.
export const dynamic = "force-dynamic";

interface ProductDetailPageProps {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Pool size we fetch when looking for "related" items — over-fetched so we
 *  can drop the current product before slicing to the display cap. */
const RELATED_PRODUCTS_POOL = 8;
/** Final number of related items rendered next to the product detail view. */
const RELATED_PRODUCTS_DISPLAY_COUNT = 4;

function attributeSlugsForProduct(
  product: Product,
  allAttributes: Awaited<ReturnType<typeof getStorefrontAttributesCached>>,
): string[] {
  const fromCatalog = allAttributes
    .filter((row) => row.categorySlug === product.categorySlug)
    .map((row) => row.slug);
  const fromVariants = categoryAttributeSlugsFromProduct(product);
  return Array.from(new Set([...fromCatalog, ...fromVariants])).sort((a, b) =>
    a.localeCompare(b),
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: ProductDetailPageProps): Promise<Metadata> {
  const [{ category, slug }, search] = await Promise.all([params, searchParams]);
  const product = await getStorefrontProductBySlugCached(slug);
  if (!product) {
    return { title: "Not found" };
  }
  const [brand, categoryMeta, seoSettings, allAttributes] = await Promise.all([
    getStorefrontBrandBySlugCached(product.brandSlug, product.categorySlug),
    getStorefrontCategoryBySlugCached(category),
    getSeoSettings(),
    getStorefrontAttributesCached(),
  ]);
  const attributeSlugs = attributeSlugsForProduct(product, allAttributes);
  const variant =
    resolveExactVariantFromSearch(product, search, attributeSlugs) ??
    getDefaultVariant(product);
  const heroImage = variant.images?.[0];
  const resolved = composeProductSeo({
    product,
    variant,
    brand: brand ? { slug: brand.slug, name: brand.name } : null,
    category: categoryMeta
      ? { slug: categoryMeta.slug, label: categoryMeta.label }
      : null,
    settings: seoSettings,
    seo: product.seo,
  });
  const canonical = productAbsoluteUrl(seoSettings.siteUrl, product, {
    variant,
  });
  const brandName = brand?.name ?? product.brandName;
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
      images: heroImage
        ? [
            {
              url: resolved.ogImageUrl || heroImage.variants.detail,
              width: heroImage.width,
              height: heroImage.height,
              alt: heroImage.alt || `${brandName} ${product.name}`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: resolved.twitterCard,
      title: resolved.title,
      description: resolved.description,
      images: resolved.ogImageUrl ? [resolved.ogImageUrl] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const [{ category, slug }, search] = await Promise.all([params, searchParams]);

  const [categoryMeta, product, allAttributes] = await Promise.all([
    getStorefrontCategoryBySlugCached(category),
    getStorefrontProductBySlugCached(slug),
    getStorefrontAttributesCached(),
  ]);

  if (!categoryMeta) {
    notFound();
  }

  if (!product) {
    notFound();
  }

  const attributeSlugs = attributeSlugsForProduct(product, allAttributes);
  const exactFromUrl = resolveExactVariantFromSearch(
    product,
    search,
    attributeSlugs,
  );
  const initialVariant = exactFromUrl ?? getDefaultVariant(product);

  if (product.categorySlug !== categoryMeta.slug) {
    redirect(productHref(product, { variant: initialVariant }));
  }

  const legacyVariantId = readLegacyVariantId(search);
  if (legacyVariantId) {
    // Legacy `?variant=<id>` links migrate once to readable params.
    redirect(productHref(product, { variant: initialVariant }));
  }

  // Bad URL recovery (combination doesn't exist on any variant) is handled
  // client-side via `history.replaceState` (see usePdpUrlParams) so configurator
  // picks never refetch this RSC page.

  const [brand, seoSettings] = await Promise.all([
    getStorefrontBrandBySlugCached(product.brandSlug, product.categorySlug),
    getSeoSettings(),
  ]);
  const brandName = brand?.name ?? product.brandSlug;
  const brandFilterHref = `/shop/${categoryMeta.slug}?brand=${product.brandSlug}`;

  const productLd = productJsonLd({
    product,
    variant: initialVariant,
    brand: brand ? { slug: brand.slug, name: brand.name } : null,
    category: { slug: categoryMeta.slug, label: categoryMeta.label },
    settings: seoSettings,
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: seoSettings.siteUrl },
    { name: "Shop", url: `${seoSettings.siteUrl}/shop` },
    {
      name: categoryMeta.label,
      url: `${seoSettings.siteUrl}/shop/${categoryMeta.slug}`,
    },
    {
      name: `${brandName} ${product.name}`,
      url: productAbsoluteUrl(seoSettings.siteUrl, product, {
        variant: initialVariant,
      }),
    },
  ]);

  return (
    <VariantProvider
      initialVariantId={initialVariant.id}
      initialGalleryGradeSlug={initialVariant.gradeSlug}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(productLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(breadcrumbLd) }}
      />
      {/* Mobile */}
      <div className="pdp-shell pb-[calc(80px+env(safe-area-inset-bottom,0px))] pt-2 md:hidden">
        <div className="mx-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <VariantAwareGallery
            product={product}
            brandName={brandName}
            layout="mobile"
          />
        </div>

        <div className="app-page pdp-content px-4 pt-4">
          <VariantSelector product={product} brandName={brandName} />

          <GradeShowcase product={product} variant="mobile" />

          <section className="pdp-related-panel cv-auto">
            <div className="app-section-eyebrow mb-3">
              <span className="text-[var(--color-accent-800)]">More from {brandName}</span>
              <Link href={brandFilterHref}>See all</Link>
            </div>
            <Suspense fallback={<MobileRelatedRailSkeleton />}>
              <MobileRelatedRail product={product} brandName={brandName} />
            </Suspense>
          </section>
        </div>
      </div>

      {/* Desktop */}
      <div className="pdp-shell mx-auto hidden max-w-[1440px] px-6 pb-12 pt-8 md:block">
        <Breadcrumbs
          categorySlug={categoryMeta.slug}
          categoryLabel={categoryMeta.label}
          brandName={brandName}
          brandFilterHref={brandFilterHref}
          modelName={product.name}
        />

        <div className="mt-6 grid grid-cols-[1.1fr_1fr] items-stretch gap-10">
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-sm)]">
            <VariantAwareGallery
              product={product}
              brandName={brandName}
              layout="desktop"
            />
          </div>

          <div className="flex min-h-0 flex-col">
            <VariantSelector product={product} brandName={brandName} />
          </div>
        </div>

        <GradeShowcase product={product} />

        <section className="pdp-related-panel cv-auto mt-16">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-ink-900)]">
              More from {brandName}
            </h2>
            <Link
              href={brandFilterHref}
              className="text-sm font-medium text-[var(--color-accent-700)] hover:underline"
            >
              See all {brandName} →
            </Link>
          </div>
          <Suspense fallback={<DesktopRelatedRailSkeleton />}>
            <DesktopRelatedRail product={product} brandName={brandName} />
          </Suspense>
        </section>
      </div>
    </VariantProvider>
  );
}

/* ─────────────────────── Related-products slots ─────────────────────── */

async function loadRelatedProducts(product: Product): Promise<Product[]> {
  const relatedRaw = await getStorefrontProducts({
    categorySlug: product.categorySlug,
    brandSlugs: [product.brandSlug],
    limit: RELATED_PRODUCTS_POOL,
  });
  return relatedRaw
    .filter((candidate) => candidate.id !== product.id)
    .slice(0, RELATED_PRODUCTS_DISPLAY_COUNT);
}

async function MobileRelatedRail({
  product,
  brandName,
}: {
  product: Product;
  brandName: string;
}) {
  const related = await loadRelatedProducts(product);
  if (related.length === 0) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 px-4 py-8 text-center text-[13px] text-[var(--color-ink-500)]">
        No more products from {brandName} right now.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
      {related.map((relatedProduct) => (
        <div key={relatedProduct.id} className="h-full">
          <ProductCard product={relatedProduct} />
        </div>
      ))}
    </div>
  );
}

async function DesktopRelatedRail({
  product,
  brandName,
}: {
  product: Product;
  brandName: string;
}) {
  const related = await loadRelatedProducts(product);
  if (related.length === 0) {
    return (
      <p className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 px-6 py-10 text-center text-[14px] text-[var(--color-ink-500)]">
        No more products from {brandName} right now.
      </p>
    );
  }
  return (
    <div className="mt-6 grid grid-cols-4 gap-5">
      {related.map((relatedProduct) => (
        <div key={relatedProduct.id} className="h-full">
          <ProductCard product={relatedProduct} />
        </div>
      ))}
    </div>
  );
}

function MobileRelatedRailSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
      {Array.from({ length: RELATED_PRODUCTS_DISPLAY_COUNT }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

function DesktopRelatedRailSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-4 gap-5">
      {Array.from({ length: RELATED_PRODUCTS_DISPLAY_COUNT }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/* ─────────────────────── Static layout pieces ─────────────────────── */

interface BreadcrumbsProps {
  categorySlug: string;
  categoryLabel: string;
  brandName: string;
  brandFilterHref: string;
  modelName: string;
}

function Breadcrumbs({
  categorySlug,
  categoryLabel,
  brandName,
  brandFilterHref,
  modelName,
}: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-[var(--color-ink-500)]">
      <Link href="/" className="hover:text-[var(--color-ink-800)]">
        Home
      </Link>
      <ChevronRight size={14} />
      <Link href="/shop" className="hover:text-[var(--color-ink-800)]">
        Shop
      </Link>
      <ChevronRight size={14} />
      <Link
        href={`/shop/${categorySlug}`}
        className="hover:text-[var(--color-ink-800)]"
      >
        {categoryLabel}
      </Link>
      <ChevronRight size={14} />
      <Link href={brandFilterHref} className="hover:text-[var(--color-ink-800)]">
        {brandName}
      </Link>
      <ChevronRight size={14} />
      <span className="text-[var(--color-ink-800)]">{modelName}</span>
    </nav>
  );
}
