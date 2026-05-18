import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";

/**
 * Product detail fallback — mirrors `app/shop/[category]/[slug]/page.tsx`:
 *   - mobile: full-bleed gallery, thumb strip, variant selector, grade
 *             showcase, "More from brand" rail
 *   - desktop: breadcrumbs → 2-column (gallery + variant selector) →
 *             grade showcase → related grid
 */
const RELATED_SKELETON_COUNT = 4;
const DESKTOP_THUMB_COUNT = 4;
const MOBILE_THUMB_COUNT = 6;

export default function ProductDetailLoading() {
  return (
    <SkeletonScreen label="Loading product">
      {/* Mobile only */}
      <div className="pb-[calc(80px+env(safe-area-inset-bottom,0px))] pt-2 md:hidden">
        <Skeleton className="aspect-square w-full rounded-none" />
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5">
          {Array.from({ length: MOBILE_THUMB_COUNT }).map((_, index) => (
            <Skeleton key={index} className="aspect-square w-14 shrink-0" />
          ))}
        </div>

        <div className="app-page">
          <div className="app-section">
            <MobileVariantSelectorSkeleton />
          </div>
          <MobileGradeShowcaseSkeleton />
          <RelatedRailSkeleton />
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-[1440px] px-6 pb-12 pt-8 md:block">
        <BreadcrumbsSkeleton />

        <div className="mt-6 grid grid-cols-[1.1fr_1fr] gap-12">
          <DesktopPhotoGallerySkeleton />
          <DesktopVariantSelectorSkeleton />
        </div>

        <DesktopGradeShowcaseSkeleton />

        <section className="mt-20">
          <div className="flex items-end justify-between gap-3">
            <Skeleton shape="text" className="h-8 w-72" />
            <Skeleton shape="text" className="h-3 w-28" />
          </div>
          <div className="mt-6 grid grid-cols-4 gap-5">
            {Array.from({ length: RELATED_SKELETON_COUNT }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </section>
      </div>
    </SkeletonScreen>
  );
}

function BreadcrumbsSkeleton() {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} shape="text" className="h-3 w-14" />
      ))}
    </div>
  );
}

function DesktopPhotoGallerySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-square w-full rounded-[var(--radius-lg)]" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: DESKTOP_THUMB_COUNT }).map((_, index) => (
          <Skeleton key={index} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
}

function MobileVariantSelectorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton shape="text" className="h-3 w-20" />
        <Skeleton shape="text" className="h-7 w-3/4" />
        <Skeleton shape="text" className="h-4 w-1/2" />
      </div>

      <div className="flex items-baseline gap-3">
        <Skeleton shape="text" className="h-8 w-40" />
        <Skeleton shape="text" className="h-4 w-20" />
      </div>

      <div className="space-y-2">
        <Skeleton shape="text" className="h-3 w-24" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton shape="text" className="h-3 w-16" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-20" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <Skeleton shape="pill" className="h-12 w-full" />
        <Skeleton shape="pill" className="h-12 w-full" />
      </div>
    </div>
  );
}

function DesktopVariantSelectorSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Skeleton shape="text" className="h-3 w-24" />
        <Skeleton shape="text" className="h-10 w-3/4" />
        <Skeleton shape="text" className="h-4 w-1/2" />
      </div>

      <div className="flex items-baseline gap-3">
        <Skeleton shape="text" className="h-10 w-48" />
        <Skeleton shape="text" className="h-5 w-24" />
      </div>

      <div className="space-y-3">
        <Skeleton shape="text" className="h-3 w-28" />
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton shape="text" className="h-3 w-20" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-24" />
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-2">
            <Skeleton shape="text" className="h-3 w-32" />
            <Skeleton shape="text" className="h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Skeleton shape="pill" className="h-12 w-full" />
        <Skeleton shape="pill" className="h-12 w-full" />
      </div>
    </div>
  );
}

function MobileGradeShowcaseSkeleton() {
  return (
    <section className="app-section">
      <div className="mb-4 space-y-1.5">
        <Skeleton shape="text" className="h-3 w-24" />
        <Skeleton shape="text" className="h-6 w-2/3" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3"
          >
            <Skeleton shape="pill" className="h-6 w-16 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton shape="text" className="h-3.5 w-1/2" />
              <Skeleton shape="text" className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DesktopGradeShowcaseSkeleton() {
  return (
    <section className="mt-20 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/40 p-8">
      <div className="mb-6 space-y-2">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton shape="text" className="h-8 w-1/3" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4"
          >
            <Skeleton shape="pill" className="h-6 w-24" />
            <Skeleton shape="text" className="h-3 w-full" />
            <Skeleton shape="text" className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedRailSkeleton() {
  return (
    <section className="app-section">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton shape="text" className="h-3 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {Array.from({ length: RELATED_SKELETON_COUNT }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
