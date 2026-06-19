import { Suspense } from "react";

import { logger } from "@store/shared";

import { FilterSidebar } from "@/components/shared/FilterSidebar";
import { ShopProductFeed } from "@/components/shared/ShopProductFeed";
import {
	ShopDesktopFilterSidebarFallback,
	ShopDesktopProductsAreaFallback,
	ShopMobileProductsAreaFallback,
	ShopMobileToolbarFilterFallback,
} from "@/components/shared/ShopListingSkeleton";
import { NavigationPendingFallback } from "@/components/shared/NavigationPendingFallback";
import type { CategoryMeta, ProductFilters, ProductPage } from "@/lib/core";
import { getFacets } from "@/lib/core/facets";
import {
	getBrandsCached,
	getGradeCountsCached,
	getProductsPageCached,
} from "@/lib/core/cached";

interface HomeShopListingProps {
	activeCategory: CategoryMeta;
	filters: ProductFilters;
	initialPage?: ProductPage;
}

/** Full shop catalog UI — filters sidebar, mobile toolbar, infinite product grid. */
export async function HomeShopListing({
	activeCategory,
	filters,
	initialPage,
}: HomeShopListingProps) {
	return (
		<>
			<div className="app-page reveal-stagger pb-10 pt-1 md:hidden">
				<div className="reveal shop-listing-toolbar-sticky mt-0 md:hidden">
					<div className="shop-listing-toolbar flex items-center gap-2 p-2">
						<Suspense fallback={<ShopMobileToolbarFilterFallback />}>
							<FilterSidebarData categorySlug={activeCategory.slug} filters={filters} />
						</Suspense>
					</div>
				</div>

				<div className="reveal shop-listing-mobile-scroll-pad">
					<Suspense fallback={<ShopMobileProductsAreaFallback />}>
						<NavigationPendingFallback fallback={<ShopMobileProductsAreaFallback />}>
							<ProductsArea meta={activeCategory} filters={filters} initialPage={initialPage} />
						</NavigationPendingFallback>
					</Suspense>
				</div>
			</div>

			<div className="hidden md:block">
				<div className="reveal-stagger mx-auto w-full max-w-[1440px] px-4 pb-20 pt-1 sm:px-6 lg:px-8">
					<div className="grid grid-cols-[272px_1fr] gap-5 xl:grid-cols-[280px_1fr] xl:gap-6">
						<div className="reveal">
							<Suspense fallback={<ShopDesktopFilterSidebarFallback />}>
								<FilterSidebarData categorySlug={activeCategory.slug} filters={filters} />
							</Suspense>
						</div>

						<div className="min-w-0">
							<div className="reveal">
								<Suspense fallback={<ShopDesktopProductsAreaFallback />}>
									<NavigationPendingFallback fallback={<ShopDesktopProductsAreaFallback />}>
										<ProductsArea meta={activeCategory} filters={filters} initialPage={initialPage} />
									</NavigationPendingFallback>
								</Suspense>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

async function FilterSidebarData({
	categorySlug,
	filters,
}: {
	categorySlug: string;
	filters: ProductFilters;
}) {
	const [brands, facets, gradeCounts] = await Promise.all([
		getBrandsCached(categorySlug),
		getFacets(filters),
		getGradeCountsCached(categorySlug),
	]);

	return (
		<FilterSidebar
			categorySlug={categorySlug}
			brands={brands}
			gradeCounts={gradeCounts}
			initialFacets={facets}
		/>
	);
}

async function ProductsArea({
	meta,
	filters,
	initialPage,
}: {
	meta: CategoryMeta;
	filters: ProductFilters;
	initialPage?: ProductPage;
}) {
	const page = initialPage ?? (await loadCategoryProducts(filters));

	return (
		<div className="mt-4 md:mt-0">
			<ShopProductFeed
				initialPage={page}
				categoryLabel={meta.label}
				apiParams={{ category: meta.slug }}
			/>
		</div>
	);
}

async function loadCategoryProducts(filters: ProductFilters): Promise<ProductPage> {
	try {
		return await getProductsPageCached(filters);
	} catch (error) {
		logger.error({ error }, "home: category products load failed, serving empty page this render");
		return { products: [], total: 0, page: 1, pageSize: 0, pageCount: 1 };
	}
}
