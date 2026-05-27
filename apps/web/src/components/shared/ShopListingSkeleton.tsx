import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";
import { ShopCategoryRailSkeleton } from "@/app/shop/_components/ShopCategoryRail";
import { GradeViewModeTabsSkeleton } from "@/app/shop/_components/GradeViewModeTabs";
import { MobileCategoryPickerSkeleton } from "@/app/shop/_components/MobileCategoryPicker";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Single source of truth for the shop listing skeleton.
 *
 * Both the route-level `loading.tsx` (segment fallback shown during the
 * server render of `page.tsx`) AND the in-page Suspense fallbacks consume
 * these pieces, so the transition between them is pixel-stable — no jump,
 * no flash of empty layout when the real data lands.
 *
 * Sizing rule: each block sets an intrinsic min-height so the viewport
 * never collapses while a section streams. On mobile the products grid
 * is sized to fill the visible area below the header + toolbar; on
 * desktop the sidebar and the main column both hold their own minimum.
 */

export const SHOP_MOBILE_SKELETON_CARDS = 6;
export const SHOP_DESKTOP_SKELETON_CARDS = 12;

export function ShopCategoryRailFallback() {
  return <ShopCategoryRailSkeleton pillCount={6} />;
}

/**
 * Mobile toolbar fallback — shape mirrors the live row exactly:
 *   [Category ▾] [Filter] [Sort ▾]
 * three compact pills on a single row, plus the grade view-mode
 * segmented tabs immediately below.
 */
export function ShopMobileToolbarFallback() {
  return (
    <>
      <div className="shop-listing-toolbar mt-1 flex items-center gap-2 p-2">
        <MobileCategoryPickerSkeleton />
        <Skeleton shape="pill" className="h-9 w-20" />
        <Skeleton shape="pill" className="ml-auto h-9 w-24" />
      </div>
      <div className="mt-3 px-1">
        <GradeViewModeTabsSkeleton className="w-full" />
      </div>
    </>
  );
}

export function ShopMobileToolbarFilterFallback() {
  return <Skeleton shape="pill" className="h-9 w-20" />;
}

export function ShopMobileProductsAreaFallback() {
  return (
    <div
      // `min-h-[60vh]` keeps the mobile shop viewport "full" while data
      // streams, even on very tall phones — without this the skeleton
      // grid (6 cards) collapses to ~half the viewport on large mobiles
      // and the page looks empty/ugly between paint and hydration.
      className="min-h-[60vh]"
    >
      <div className="mt-4 flex items-center justify-between">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton shape="text" className="h-3 w-20" />
      </div>
      <div className="mt-6">
        <ProductGridSkeleton
          count={SHOP_MOBILE_SKELETON_CARDS}
          className="grid grid-cols-2 gap-3 sm:gap-4"
        />
      </div>
      <div className="mt-10">
        <ShopPaginationFallback />
      </div>
    </div>
  );
}

export function ShopDesktopFilterSidebarFallback() {
  return (
    <aside className="space-y-5">
      {/* View group — first on desktop, just two rows. */}
      <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-accent-200)]/35 bg-[var(--color-surface)] p-4">
        <Skeleton shape="text" className="h-3 w-12" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton shape="text" className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, groupIndex) => (
        <div
          key={groupIndex}
          className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-accent-200)]/35 bg-[var(--color-surface)] p-4"
        >
          <Skeleton shape="text" className="h-3 w-24" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton shape="text" className="h-3 flex-1" />
                <Skeleton shape="text" className="h-3 w-6" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

export function ShopDesktopProductsAreaFallback() {
  return (
    <div className="min-h-[70vh] space-y-6">
      <div className="shop-listing-toolbar flex items-center justify-between gap-4 px-4 py-3">
        <Skeleton shape="text" className="h-4 w-40" />
        <Skeleton shape="pill" className="h-10 w-36" />
      </div>
      <ProductGridSkeleton count={SHOP_DESKTOP_SKELETON_CARDS} />
      <ShopPaginationFallback />
    </div>
  );
}

export function ShopPaginationFallback() {
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
