import { ShopActiveFilterChips } from "@/app/_components/shop/ShopActiveFilterChips";
import { MobileCategoryPicker } from "@/app/_components/shop/MobileCategoryPicker";
import { ShopCategoryRail } from "@/app/_components/shop/ShopCategoryRail";
import { ShopFilterRow } from "@/app/_components/shop/ShopFilterRow";
import { FilterSidebar } from "@/components/shared/FilterSidebar";
import { getFacets } from "@/lib/core/facets";
import {
	getBrandsCached,
	getGradeCountsCached,
	getCategoriesCached,
} from "@/lib/core/cached";
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
				<div className="shop-listing-toolbar flex items-center gap-2 p-2">
					<MobileCategoryPicker activeSlug={activeSlug} categories={categories} />
					<FilterSidebar {...filterProps} />
				</div>
			</div>

			<div className="hidden flex-col gap-3 pb-4 md:flex md:pb-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<ShopCategoryRail activeSlug={activeSlug} categories={categories} />
					<ShopFilterRow {...filterProps} />
				</div>
				<ShopActiveFilterChips {...filterProps} />
			</div>
		</>
	);
}
