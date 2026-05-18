import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { ProductImage } from "@/components/shared/ProductImage";
import { VariantSelector } from "@/components/shared/VariantSelector";
import { VariantProvider } from "@/components/shared/VariantContext";
import { GradeShowcase } from "@/components/shared/GradeShowcase";
import { AccessoryDetailView } from "@/components/shared/AccessoryDetailView";
import { formatStorage, type Phone } from "@store/shared";
import { getStorefrontProducts } from "@/lib/storefront";
import {
  getStorefrontBrandBySlugCached,
  getStorefrontCategoryByPathSegmentCached,
  getStorefrontProductBySlugCached,
} from "@/lib/storefront/cached";
import { productHref } from "@/data/products";
import { getDefaultVariant } from "@/lib/productSummary";

// Live pricing + stock change frequently — never cache the detail page.
export const dynamic = "force-dynamic";

interface ProductDetailPageProps {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Pool size we fetch when looking for "related" items — over-fetched so we
 *  can drop the current product before slicing to the display cap. */
const RELATED_PHONES_POOL = 8;
const RELATED_ACCESSORIES_POOL = 12;
/** Final number of related items rendered next to the product detail view. */
const RELATED_PRODUCTS_DISPLAY_COUNT = 4;
/** Thumbnail strip caps in the photo galleries. Mobile shows the strip
 *  scrolling, desktop shows a 4-column grid. */
const MOBILE_GALLERY_THUMB_COUNT = 6;
const DESKTOP_GALLERY_THUMB_COUNT = 4;

export async function generateMetadata({
  params,
  searchParams,
}: ProductDetailPageProps): Promise<Metadata> {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  // React `cache()` makes this lookup free if the page body has already
  // fetched the same product in this render — or vice versa.
  const product = await getStorefrontProductBySlugCached(slug);
  if (!product) {
    return { title: "Not found" };
  }
  const brand = await getStorefrontBrandBySlugCached(product.brandSlug);
  const requestedVariantId =
    typeof search.variant === "string" ? search.variant : undefined;
  if (product.category === "phone") {
    const initialVariant =
      (requestedVariantId
        ? product.variants.find((variant) => variant.id === requestedVariantId)
        : undefined) ?? getDefaultVariant(product);
    return {
      title: `${brand?.name ?? ""} ${product.modelName} (${formatStorage(initialVariant.storageGb)})`,
      description: product.highlights.join(" · "),
    };
  }
  return {
    title: `${brand?.name ?? ""} ${product.modelName}`,
    description: product.highlights.join(" · "),
  };
}

/**
 * Product detail page.
 *
 * Render strategy:
 *   1. Two top-level awaits are unavoidable — we need the category meta
 *      and the product itself to decide notFound / redirect / render.
 *      Both are React-`cache()`-deduped lookups, so the cost is paid
 *      once even though `generateMetadata` also calls them.
 *   2. Once the product is in hand, the primary detail content
 *      (gallery, variant selector, grade showcase) renders
 *      synchronously — this is the page's reason for existing.
 *   3. The "More from {brand}" related rail is a secondary read and
 *      sits behind a Suspense boundary so it streams in independently
 *      with its own product-card skeleton fallback.
 */
export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const [{ category, slug }, search] = await Promise.all([params, searchParams]);

  // Two independent reads — fire them in parallel. React `cache()` makes the
  // product lookup free for `generateMetadata` (same render).
  const [categoryMeta, product] = await Promise.all([
    getStorefrontCategoryByPathSegmentCached(category),
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
  if (product.category !== categoryMeta.id) {
    redirect(productHref(product));
  }

  const requestedVariantId =
    typeof search.variant === "string" ? search.variant : undefined;

  // Accessories use a focused, self-contained view.
  if (product.category === "accessory") {
    const initial =
      (requestedVariantId
        ? product.variants.find((variant) => variant.id === requestedVariantId)
        : undefined) ?? getDefaultVariant(product);
    const sameTypeRaw = await getStorefrontProducts({
      category: "accessory",
      limit: RELATED_ACCESSORIES_POOL,
    });
    const relatedAccessories = sameTypeRaw
      .filter(
        (candidate) =>
          candidate.id !== product.id &&
          candidate.category === "accessory" &&
          candidate.accessoryType === product.accessoryType,
      )
      .slice(0, RELATED_PRODUCTS_DISPLAY_COUNT);
    return (
      <AccessoryDetailView
        accessory={product}
        initialVariantId={initial.id}
        relatedAccessories={relatedAccessories}
      />
    );
  }

  if (product.category !== "phone") {
    notFound();
  }

  const phone: Phone = product;
  const initialVariant =
    (requestedVariantId
      ? phone.variants.find((variant) => variant.id === requestedVariantId)
      : undefined) ?? getDefaultVariant(phone);
  // Brand is needed for the breadcrumb + variant selector heading; await it
  // before the page chrome renders.
  const brand = await getStorefrontBrandBySlugCached(phone.brandSlug);
  const brandName = brand?.name ?? phone.brandSlug;
  const brandFilterHref = `/shop/${categoryMeta.pathSegment}?brand=${phone.brandSlug}`;

  return (
    <VariantProvider initialVariantId={initialVariant.id}>
      {/* Mobile only — native */}
      <div className="pb-[calc(80px+env(safe-area-inset-bottom,0px))] pt-2 md:hidden">
        <MobileGallery
          imageUrl={phone.imageUrl}
          galleryUrls={phone.galleryUrls}
          brandName={brandName}
          modelName={phone.modelName}
          colorName={initialVariant.colorName}
          brandSlug={phone.brandSlug}
        />

        <div className="app-page">
          <div className="app-section">
            <VariantSelector phone={phone} brandName={brandName} />
          </div>

          <GradeShowcase phone={phone} variant="mobile" />

          <section className="app-section">
            <div className="app-section-eyebrow">
              <span>More from {brandName}</span>
              <Link href={brandFilterHref}>See all</Link>
            </div>
            <Suspense fallback={<MobileRelatedRailSkeleton />}>
              <MobileRelatedRail phone={phone} />
            </Suspense>
          </section>
        </div>
      </div>

      {/* Desktop — single layout */}
      <div className="mx-auto hidden max-w-[1440px] px-6 pb-12 pt-8 md:block">
        <Breadcrumbs
          brandName={brandName}
          brandFilterHref={brandFilterHref}
          modelName={phone.modelName}
        />

        <div className="mt-6 grid grid-cols-[1.1fr_1fr] gap-12">
          <PhotoGallery
            imageUrl={phone.imageUrl}
            galleryUrls={phone.galleryUrls}
            brandName={brandName}
            modelName={phone.modelName}
            colorName={initialVariant.colorName}
            brandSlug={phone.brandSlug}
          />

          <div>
            <VariantSelector phone={phone} brandName={brandName} />
          </div>
        </div>

        <GradeShowcase phone={phone} />

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
            <DesktopRelatedRail phone={phone} />
          </Suspense>
        </section>
      </div>
    </VariantProvider>
  );
}

/* ─────────────────────── Related-products slots ─────────────────────── */

async function loadRelatedPhones(phone: Phone): Promise<Phone[]> {
  const relatedRaw = await getStorefrontProducts({
    category: "phone",
    brandSlugs: [phone.brandSlug],
    limit: RELATED_PHONES_POOL,
  });
  return relatedRaw
    .filter((candidate): candidate is Phone => candidate.category === "phone" && candidate.id !== phone.id)
    .slice(0, RELATED_PRODUCTS_DISPLAY_COUNT);
}

async function MobileRelatedRail({ phone }: { phone: Phone }) {
  const related = await loadRelatedPhones(phone);
  if (related.length === 0) {
    return null;
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
      {related.map((relatedPhone) => (
        <ProductCard key={relatedPhone.id} product={relatedPhone} />
      ))}
    </div>
  );
}

async function DesktopRelatedRail({ phone }: { phone: Phone }) {
  const related = await loadRelatedPhones(phone);
  if (related.length === 0) {
    return null;
  }
  return (
    <div className="mt-6 grid grid-cols-4 gap-5">
      {related.map((relatedPhone) => (
        <ProductCard key={relatedPhone.id} product={relatedPhone} />
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

interface MobileGalleryProps {
  imageUrl: string;
  galleryUrls: string[];
  brandName: string;
  modelName: string;
  colorName: string;
  brandSlug: string;
}

function MobileGallery({
  imageUrl,
  galleryUrls,
  brandName,
  modelName,
  colorName,
  brandSlug,
}: MobileGalleryProps) {
  const thumbnails = galleryUrls.length > 0 ? galleryUrls : [imageUrl];
  return (
    <>
      <div className="relative aspect-square w-full bg-[var(--color-canvas-deep)]">
        <ProductImage
          imageUrl={imageUrl}
          brandName={brandName}
          modelName={modelName}
          colorName={colorName}
          brandSlug={brandSlug}
          sizes="100vw"
          priority
        />
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-2.5 no-scrollbar">
        {thumbnails.slice(0, MOBILE_GALLERY_THUMB_COUNT).map((thumbUrl, thumbIndex) => (
          <button
            key={`${thumbUrl}-${thumbIndex}`}
            type="button"
            aria-label={`Photo ${thumbIndex + 1}`}
            className="relative aspect-square w-14 shrink-0 overflow-hidden rounded-md border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]"
          >
            <ProductImage
              imageUrl={thumbUrl}
              brandName={brandName}
              modelName={modelName}
              colorName={colorName}
              brandSlug={brandSlug}
              sizes="64px"
            />
          </button>
        ))}
      </div>
    </>
  );
}

interface BreadcrumbsProps {
  brandName: string;
  brandFilterHref: string;
  modelName: string;
}

function Breadcrumbs({ brandName, brandFilterHref, modelName }: BreadcrumbsProps) {
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
      <Link href="/shop/phones" className="hover:text-[var(--color-ink-800)]">
        Phones
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

interface PhotoGalleryProps {
  imageUrl: string;
  galleryUrls: string[];
  brandName: string;
  modelName: string;
  colorName: string;
  brandSlug: string;
}

function PhotoGallery({
  imageUrl,
  galleryUrls,
  brandName,
  modelName,
  colorName,
  brandSlug,
}: PhotoGalleryProps) {
  const thumbnails = galleryUrls.length > 0 ? galleryUrls : [imageUrl];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]">
        <ProductImage
          imageUrl={imageUrl}
          brandName={brandName}
          modelName={modelName}
          colorName={colorName}
          brandSlug={brandSlug}
          sizes="(max-width: 1024px) 50vw, 50vw"
          priority
        />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {thumbnails.slice(0, DESKTOP_GALLERY_THUMB_COUNT).map((thumbUrl, thumbIndex) => (
          <button
            key={`${thumbUrl}-${thumbIndex}`}
            type="button"
            aria-label={`Photo ${thumbIndex + 1}`}
            className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] transition-colors hover:border-[var(--color-ink-300)]"
          >
            <ProductImage
              imageUrl={thumbUrl}
              brandName={brandName}
              modelName={modelName}
              colorName={colorName}
              brandSlug={brandSlug}
              sizes="120px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
