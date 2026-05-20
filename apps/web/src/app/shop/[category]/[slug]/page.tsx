import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";

import type { Product, StoredImage } from "@store/shared";

import { GradeShowcase } from "@/components/shared/GradeShowcase";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { ProductImage } from "@/components/shared/ProductImage";
import { VariantProvider } from "@/components/shared/VariantContext";
import { VariantSelector } from "@/components/shared/VariantSelector";
import { getDefaultVariant } from "@/lib/productSummary";
import { getStorefrontProducts } from "@/lib/storefront";
import {
  getStorefrontBrandBySlugCached,
  getStorefrontCategoryBySlugCached,
  getStorefrontProductBySlugCached,
} from "@/lib/storefront/cached";
import { productHref } from "@/data/products";

/**
 * Generic product detail page.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - One PDP serves every category. The previous phone/accessory fork
 *     is gone — variants carry generic `attributes` and `images`, so the
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

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  // React `cache()` makes this lookup free if the page body has already
  // fetched the same product in this render — or vice versa.
  const product = await getStorefrontProductBySlugCached(slug);
  if (!product) {
    return { title: "Not found" };
  }
  const brand = await getStorefrontBrandBySlugCached(product.brandSlug);
  const brandName = brand?.name ?? product.brandSlug;
  return {
    title: `${brandName} ${product.name}`,
    description: `${brandName} ${product.name} on ibrahimMobiles.`,
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const [{ category, slug }, search] = await Promise.all([params, searchParams]);

  // Two independent reads — fire them in parallel. React `cache()` makes the
  // product lookup free for `generateMetadata` (same render).
  const [categoryMeta, product] = await Promise.all([
    getStorefrontCategoryBySlugCached(category),
    getStorefrontProductBySlugCached(slug),
  ]);

  if (!categoryMeta) {
    notFound();
  }

  if (!product) {
    notFound();
  }

  // If a product is opened under the wrong category segment, 308-redirect to
  // its canonical URL — keeps every link in the codebase a single source of
  // truth via productHref().
  if (product.categorySlug !== categoryMeta.slug) {
    redirect(productHref(product));
  }

  const requestedVariantId =
    typeof search.variant === "string" ? search.variant : undefined;
  const initialVariant =
    (requestedVariantId
      ? product.variants.find((variant) => variant.id === requestedVariantId)
      : undefined) ?? getDefaultVariant(product);

  const brand = await getStorefrontBrandBySlugCached(product.brandSlug);
  const brandName = brand?.name ?? product.brandSlug;
  const brandFilterHref = `/shop/${categoryMeta.slug}?brand=${product.brandSlug}`;
  const heroImage = initialVariant.images?.[0];
  const galleryImages = initialVariant.images ?? [];

  return (
    <VariantProvider initialVariantId={initialVariant.id}>
      {/* Mobile */}
      <div className="pb-[calc(80px+env(safe-area-inset-bottom,0px))] pt-2 md:hidden">
        <MobileGallery
          images={galleryImages}
          name={product.name}
          brandName={brandName}
          brandSlug={product.brandSlug}
        />

        <div className="app-page">
          <div className="app-section">
            <VariantSelector product={product} brandName={brandName} />
          </div>

          <GradeShowcase product={product} variant="mobile" />

          <section className="app-section">
            <div className="app-section-eyebrow">
              <span>More from {brandName}</span>
              <Link href={brandFilterHref}>See all</Link>
            </div>
            <Suspense fallback={<MobileRelatedRailSkeleton />}>
              <MobileRelatedRail product={product} />
            </Suspense>
          </section>
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-[1440px] px-6 pb-12 pt-8 md:block">
        <Breadcrumbs
          categorySlug={categoryMeta.slug}
          categoryLabel={categoryMeta.label}
          brandName={brandName}
          brandFilterHref={brandFilterHref}
          modelName={product.name}
        />

        <div className="mt-6 grid grid-cols-[1.1fr_1fr] gap-12">
          <PhotoGallery
            images={galleryImages}
            hero={heroImage}
            name={product.name}
            brandName={brandName}
            brandSlug={product.brandSlug}
          />

          <div>
            <VariantSelector product={product} brandName={brandName} />
          </div>
        </div>

        <GradeShowcase product={product} />

        <section className="mt-20">
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
            <DesktopRelatedRail product={product} />
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

async function MobileRelatedRail({ product }: { product: Product }) {
  const related = await loadRelatedProducts(product);
  if (related.length === 0) {
    return null;
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
      {related.map((relatedProduct) => (
        <ProductCard key={relatedProduct.id} product={relatedProduct} />
      ))}
    </div>
  );
}

async function DesktopRelatedRail({ product }: { product: Product }) {
  const related = await loadRelatedProducts(product);
  if (related.length === 0) {
    return null;
  }
  return (
    <div className="mt-6 grid grid-cols-4 gap-5">
      {related.map((relatedProduct) => (
        <ProductCard key={relatedProduct.id} product={relatedProduct} />
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

interface GalleryProps {
  images: StoredImage[];
  name: string;
  brandName: string;
  brandSlug: string;
}

function MobileGallery({ images, name, brandName, brandSlug }: GalleryProps) {
  const hero = images[0];
  return (
    <>
      <div className="relative aspect-square w-full bg-[var(--color-canvas-deep)]">
        <ProductImage
          image={hero}
          variant="detail"
          name={name}
          brandName={brandName}
          brandSlug={brandSlug}
          sizes="100vw"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5 no-scrollbar">
          {images.slice(0, 6).map((image, index) => (
            <div
              key={`${image.variants.thumb}-${index}`}
              className="relative aspect-square w-14 shrink-0 overflow-hidden rounded-md border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]"
            >
              <ProductImage
                image={image}
                variant="thumb"
                name={name}
                brandName={brandName}
                brandSlug={brandSlug}
                sizes="64px"
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

interface PhotoGalleryProps {
  images: StoredImage[];
  hero: StoredImage | undefined;
  name: string;
  brandName: string;
  brandSlug: string;
}

function PhotoGallery({ images, hero, name, brandName, brandSlug }: PhotoGalleryProps) {
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]">
        <ProductImage
          image={hero}
          variant="detail"
          name={name}
          brandName={brandName}
          brandSlug={brandSlug}
          sizes="(max-width: 1024px) 50vw, 50vw"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.slice(0, 4).map((image, index) => (
            <button
              key={`${image.variants.thumb}-${index}`}
              type="button"
              aria-label={`Photo ${index + 1}`}
              className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] transition-colors hover:border-[var(--color-ink-300)]"
            >
              <ProductImage
                image={image}
                variant="thumb"
                name={name}
                brandName={brandName}
                brandSlug={brandSlug}
                sizes="120px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
