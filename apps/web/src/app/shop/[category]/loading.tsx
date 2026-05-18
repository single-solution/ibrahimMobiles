import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";

/**
 * Category listing fallback — mirrors `app/shop/[category]/page.tsx`:
 *   - mobile: category selector → filter & sort bar → results count → grid
 *   - desktop: sidebar (filters) + main column (selector → tools → grid)
 *
 * Card count is sized to fill one viewport so the skeleton doesn't visibly
 * end while real data is still arriving.
 */
const MOBILE_SKELETON_CARDS = 6;
const DESKTOP_SKELETON_CARDS = 12;

export default function CategoryListingLoading() {
  return (
    <SkeletonScreen label="Loading shop">
      {/* Mobile only */}
      <div className="app-page pb-6 pt-4 md:hidden">
        <CategorySelectorSkeleton />
        <div className="mt-4 flex items-center gap-2">
          <Skeleton shape="pill" className="h-10 w-24" />
          <Skeleton shape="pill" className="h-10 w-28" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Skeleton shape="text" className="h-3 w-32" />
          <Skeleton shape="text" className="h-3 w-20" />
        </div>
        <div className="app-section">
          <ProductGridSkeleton count={MOBILE_SKELETON_CARDS} className="grid grid-cols-2 gap-2.5 sm:gap-3" />
        </div>
        <div className="app-section">
          <PaginationSkeleton />
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-[1440px] px-6 pb-16 pt-8 md:block">
        <div className="grid grid-cols-[260px_1fr] gap-8">
          <DesktopFilterSidebarSkeleton />
          <div className="space-y-6">
            <CategorySelectorSkeleton />
            <div className="flex items-center justify-between">
              <Skeleton shape="text" className="h-4 w-40" />
              <Skeleton shape="pill" className="h-10 w-36" />
            </div>
            <ProductGridSkeleton count={DESKTOP_SKELETON_CARDS} />
            <PaginationSkeleton />
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}

/**
 * Mirrors `<ShopPagination>`: a centered pill row of page-number buttons
 * with prev / next arrows flanking them. The real component renders
 * roughly 5–7 buttons; the skeleton fixes the count so the row doesn't
 * grow/shrink when the data lands.
 */
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
              <Skeleton shape="text" className="h-3.5 w-20 md:h-4" />
              <Skeleton shape="text" className="h-3 w-8" />
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
    <aside className="space-y-5">
      {Array.from({ length: 4 }).map((_, groupIndex) => (
        <div
          key={groupIndex}
          className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4"
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
