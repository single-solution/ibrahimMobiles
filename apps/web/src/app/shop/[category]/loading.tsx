import { SkeletonScreen } from "@/components/ui/Skeleton";
import {
  ShopCategoryRailFallback,
  ShopDesktopFilterSidebarFallback,
  ShopDesktopProductsAreaFallback,
  ShopMobileProductsAreaFallback,
  ShopMobileToolbarFallback,
} from "@/components/shared/ShopListingSkeleton";

/**
 * Category listing fallback — mirrors `app/shop/[category]/page.tsx`:
 *   - mobile: compact toolbar [Category][Filter][Sort] → segmented
 *             grade-mode tabs → results count → grid
 *   - desktop: sidebar (filters) + main column (category rail →
 *             toolbar with grade tabs + sort → grid)
 *
 * Every block reuses the composables in `ShopListingSkeleton.tsx` so the
 * transition from segment loading → page render is pixel-stable: no jump,
 * no flash, no "empty" frame between the two.
 */
export default function CategoryListingLoading() {
  return (
    <SkeletonScreen label="Loading shop">
      {/* Mobile only — match `page.tsx` paddings exactly (`pt-2 pb-10`). */}
      <div className="app-page pb-10 pt-2 md:hidden">
        <ShopMobileToolbarFallback />
        <ShopMobileProductsAreaFallback />
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="mx-auto max-w-[1440px] px-6 pb-20 pt-4">
          <div className="grid grid-cols-[272px_1fr] gap-10 xl:grid-cols-[280px_1fr] xl:gap-12">
            <ShopDesktopFilterSidebarFallback />
            <div className="space-y-3">
              <ShopCategoryRailFallback />
              <ShopDesktopProductsAreaFallback />
            </div>
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}
