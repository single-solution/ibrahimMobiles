"use client";

import { usePathname } from "next/navigation";

import { ShopCategoryRail } from "@/app/shop/_components/ShopCategoryRail";
import { MobileCategoryPicker } from "@/app/shop/_components/MobileCategoryPicker";
import {
  ShopDesktopFilterSidebarFallback,
  ShopDesktopProductsAreaFallback,
  ShopMobileProductsAreaFallback,
} from "@/components/shared/ShopListingSkeleton";
import { useCategories } from "@/lib/storefront/storefrontReferenceContext";

/**
 * Category listing fallback.
 *
 * Renders the actual category rail (desktop) and mobile category picker
 * for the slug being navigated to, so those controls stay visible during
 * the segment swap. Only the products column is skeletoned — the rest of
 * the shell carries over from the outgoing page.
 *
 * Categories come from `StorefrontReferenceContext` (provided in the root
 * layout) so this client component has the data without any fetch.
 */
export default function CategoryListingLoading() {
  const pathname = usePathname();
  // `/shop/<slug>` or `/shop/<slug>/<product>` — segment 2 is always the
  // category slug for any URL that resolves to this loading boundary.
  const activeSlug = pathname?.split("/")[2] ?? "";
  const categories = useCategories();

  return (
    <>
      <div className="app-page pb-10 pt-1 md:hidden">
        <div className="shop-listing-toolbar mt-0 flex items-center gap-2 p-2">
          <MobileCategoryPicker activeSlug={activeSlug} categories={categories} />
          <div className="ml-auto h-9 w-20" aria-hidden />
        </div>
        <ShopMobileProductsAreaFallback />
      </div>

      <div className="hidden md:block">
        <div className="mx-auto max-w-[1440px] px-6 pb-20 pt-1">
          <div className="grid grid-cols-[272px_1fr] gap-5 xl:grid-cols-[280px_1fr] xl:gap-6">
            <ShopDesktopFilterSidebarFallback />
            <div className="min-w-0 space-y-3">
              <ShopCategoryRail activeSlug={activeSlug} categories={categories} />
              <ShopDesktopProductsAreaFallback />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
