import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";
import { ShopCategoryRailSkeleton } from "@/components/shop/ShopCategoryRail";

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
      <div className="app-page pb-10 pt-5 md:hidden">
        <CategorySelectorSkeleton />
        <div className="shop-listing-toolbar mt-3 flex items-center gap-2.5 p-2">
          <Skeleton shape="pill" className="h-10 w-24" />
          <Skeleton shape="pill" className="h-10 w-28" />
        </div>
        <div className="mt-5 flex items-center justify-between">
          <Skeleton shape="text" className="h-3 w-32" />
          <Skeleton shape="text" className="h-3 w-20" />
        </div>
        <div className="mt-6">
          <ProductGridSkeleton count={MOBILE_SKELETON_CARDS} className="grid grid-cols-2 gap-3 sm:gap-4" />
        </div>
        <div className="mt-10">
          <PaginationSkeleton />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="mx-auto max-w-[1440px] px-6 pb-20 pt-10">
          <div className="grid grid-cols-[272px_1fr] gap-10 xl:grid-cols-[280px_1fr] xl:gap-12">
            <DesktopFilterSidebarSkeleton />
            <div className="space-y-3">
              <CategorySelectorSkeleton />
              <div className="space-y-8">
                <div className="shop-listing-toolbar flex items-center justify-between gap-4 px-4 py-3">
                  <Skeleton shape="text" className="h-4 w-40" />
                  <Skeleton shape="pill" className="h-10 w-36" />
                </div>
                <ProductGridSkeleton count={DESKTOP_SKELETON_CARDS} />
                <PaginationSkeleton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}

/**
 * Mirrors `<ShopPagination>`: a centered pill row of page-number buttons
 * with prev / next arrows flanking them. The skeleton fixes the count so the
 * row doesn't grow/shrink when the data lands.
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
  return <ShopCategoryRailSkeleton pillCount={6} />;
}

function DesktopFilterSidebarSkeleton() {
  return (
    <aside className="space-y-5">
      {Array.from({ length: 4 }).map((_, groupIndex) => (
        <div
          key={groupIndex}
          className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-accent-200)]/35 bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
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
