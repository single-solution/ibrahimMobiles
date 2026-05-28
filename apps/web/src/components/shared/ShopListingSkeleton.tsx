import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Shop listing skeleton pieces — consumed by:
 *   - `shop/loading.tsx` and `shop/[category]/loading.tsx` (route-level
 *     fallbacks during pathname changes)
 *   - in-page `<Suspense>` boundaries in `[category]/page.tsx`
 *
 * Query-only updates (filters, sort, pagination) keep the live toolbar
 * and category rail visible and only swap the grid via
 * `NavigationPendingFallback`. Pathname changes (category switch) show
 * the products + sidebar skeletons here while the category rail / mobile
 * picker stay rendered from the loading boundary.
 *
 * Sizing rule: each block sets an intrinsic min-height so the viewport
 * never collapses while a section streams.
 */

export const SHOP_MOBILE_SKELETON_CARDS = 6;
export const SHOP_DESKTOP_SKELETON_CARDS = 12;

export function ShopCategoryRailFallback({ pillCount = 6 }: { pillCount?: number }) {
  return (
    <nav
      aria-hidden
      className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:gap-3 md:px-0 md:pb-0"
    >
      {Array.from({ length: pillCount }).map((_, index) => (
        <Skeleton key={index} shape="pill" className="h-9 w-28 shrink-0 md:h-10 md:w-32" />
      ))}
    </nav>
  );
}

/** Matches the mobile category trigger pill in `MobileCategoryPicker`. */
export function ShopMobileCategoryPickerFallback() {
  return <Skeleton shape="pill" className="h-9 min-w-0 max-w-[12rem] flex-1" />;
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
      <div className="mt-4">
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

/**
 * Desktop filter sidebar fallback for the category-segment loader.
 *
 * Mirrors the live `FilterSidebar` chrome (outer rounded border, inner
 * `p-2.5` padding, dividers, price footer) so the transition into the
 * rendered sidebar is pixel-stable. All groups are skeletoned — the
 * sidebar has no controls that can act independently of the category
 * data we're waiting on.
 */
export function ShopDesktopFilterSidebarFallback() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-accent-200)]/45 bg-[var(--color-surface)]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-3 p-2.5 pb-3">
          <FilterSidebarFallbackGroup title="Grade">
            <FilterCheckRowSkeletonList rows={4} />
          </FilterSidebarFallbackGroup>
          <FilterSidebarFallbackDivider />

          <FilterSidebarFallbackGroup title="Brand">
            <FilterCheckRowSkeletonList rows={6} />
          </FilterSidebarFallbackGroup>
          <FilterSidebarFallbackDivider />

          {Array.from({ length: 2 }).map((_, groupIndex) => (
            <FilterSidebarFallbackGroup
              key={groupIndex}
              title={<Skeleton shape="text" className="h-3 w-20" />}
            >
              <FilterCheckRowSkeletonList rows={4} />
            </FilterSidebarFallbackGroup>
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] p-2.5">
        <div className="space-y-2">
          <Skeleton shape="text" className="h-3 w-12" />
          <div className="flex items-center gap-2">
            <Skeleton shape="pill" className="h-9 flex-1" />
            <span aria-hidden className="text-[var(--color-ink-300)]">–</span>
            <Skeleton shape="pill" className="h-9 flex-1" />
          </div>
          <Skeleton shape="pill" className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}

interface FilterSidebarFallbackGroupProps {
  title: React.ReactNode;
  children: React.ReactNode;
}

function FilterSidebarFallbackGroup({
  title,
  children,
}: FilterSidebarFallbackGroupProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FilterSidebarFallbackDivider() {
  return <div className="h-px bg-[var(--color-ink-100)]" />;
}

function FilterCheckRowSkeletonList({ rows }: { rows: number }) {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 py-1"
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-[18px]" />
            <Skeleton shape="text" className="h-3 w-24" />
          </div>
          <Skeleton shape="text" className="h-3 w-6" />
        </div>
      ))}
    </div>
  );
}

export function ShopDesktopProductsAreaFallback() {
  return (
    <div className="min-h-[70vh] space-y-6">
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
