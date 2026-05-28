"use client";

import { ShopCategoryRail } from "@/app/shop/_components/ShopCategoryRail";
import { MobileCategoryPicker } from "@/app/shop/_components/MobileCategoryPicker";
import {
  ShopDesktopFilterSidebarFallback,
  ShopDesktopProductsAreaFallback,
  ShopMobileProductsAreaFallback,
} from "@/components/shared/ShopListingSkeleton";
import { useCategories } from "@/lib/storefront/storefrontReferenceContext";

/**
 * `/shop` redirects to `/shop/[firstActiveCategory]` server-side. This
 * fallback paints the instant the user taps a "Shop" link so the screen
 * isn't blank during the redirect.
 *
 * Same shape as `[category]/loading.tsx` — category rail / picker stay
 * rendered, only the products column shows a skeleton. We don't know the
 * resolved slug yet (the redirect hasn't happened) so no pill is marked
 * active; that highlight appears the instant the category page commits.
 */
export default function ShopIndexLoading() {
  const categories = useCategories();

  return (
    <>
      <div className="app-page pb-10 pt-1 md:hidden">
        <div className="shop-listing-toolbar mt-0 flex items-center gap-2 p-2">
          <MobileCategoryPicker activeSlug="" categories={categories} />
          <div className="ml-auto h-9 w-20" aria-hidden />
        </div>
        <ShopMobileProductsAreaFallback />
      </div>

      <div className="hidden md:block">
        <div className="mx-auto max-w-[1440px] px-6 pb-20 pt-1">
          <div className="grid grid-cols-[272px_1fr] gap-5 xl:grid-cols-[280px_1fr] xl:gap-6">
            <ShopDesktopFilterSidebarFallback />
            <div className="min-w-0 space-y-3">
              <ShopCategoryRail activeSlug="" categories={categories} />
              <ShopDesktopProductsAreaFallback />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
