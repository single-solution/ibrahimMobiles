import { ShopActiveFilterChips } from "@/app/_components/shop/ShopActiveFilterChips";
import { MobileCategoryPicker } from "@/app/_components/shop/MobileCategoryPicker";
import { ShopCategoryRail } from "@/app/_components/shop/ShopCategoryRail";
import { ShopFilterRow } from "@/app/_components/shop/ShopFilterRow";
import { FilterSidebar } from "@/components/shared/FilterSidebar";
import { getFacets } from "@/lib/core/facets";
import { getBrandsCached, getGradeCountsCached, getCategoriesCached } from "@/lib/core/cached";
import type { ProductFilters } from "@/lib/core";

interface ShopCategoryToolbarProps {
	activeSlug: string;
	filters: ProductFilters;
}

export async function ShopCategoryToolbar({ activeSlug, filters }: ShopCategoryToolbarProps) {
	const [categories, brands, gradeCounts, initialFacets] = await Promise.all([
		getCategoriesCached(),
		getBrandsCached(activeSlug),
		getGradeCountsCached(activeSlug),
		getFacets(filters),
	]);

	const filterProps = {
		categorySlug: activeSlug,
		brands,
		gradeCounts,
		initialFacets,
	};

	return (
		<>
			<div className="shop-listing-toolbar-sticky md:hidden">
				<div className="shop-listing-toolbar flex min-w-0 items-center gap-2 p-2">
					<MobileCategoryPicker activeSlug={activeSlug} categories={categories} />
					<FilterSidebar {...filterProps} />
				</div>
			</div>

			<div className="hidden min-w-0 flex-col gap-3 pb-4 md:flex md:pb-5">
				<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0 flex-1 overflow-hidden">
						<ShopCategoryRail activeSlug={activeSlug} categories={categories} />
					</div>
					<div className="min-w-0 shrink-0 overflow-x-auto">
						<ShopFilterRow {...filterProps} />
					</div>
				</div>
				<ShopActiveFilterChips {...filterProps} />
			</div>
		</>
	);
}
