import { categoryBrandHasEligibleGradeIntent } from "@store/db";
import { hasNonIndexableListingFilters, parseBrandOnlyFilter, parseIndexableIntentSurface } from "@store/shared";

import type { ProductFilters } from "@/lib/core";

/** Filter listing pages with active non-whitelisted params should not be indexed. */
export function shouldNoindexFilteredCategoryPage(
	rawSearchParams: Record<string, string | string[] | undefined>,
	categorySlug: string,
	filters: ProductFilters,
): boolean {
	const hasFilters = Object.keys(rawSearchParams).some((key) => rawSearchParams[key] !== undefined);
	if (!hasFilters) {
		return false;
	}

	const intentKey = parseIndexableIntentSurface(rawSearchParams, categorySlug);
	if (intentKey && !hasNonIndexableListingFilters(filters)) {
		return false;
	}

	return true;
}

/**
 * Async noindex check including thin brand-only pages when a stronger
 * brand+grade intent surface is eligible for the same brand.
 */
export async function shouldNoindexFilteredCategoryPageAsync(
	rawSearchParams: Record<string, string | string[] | undefined>,
	categorySlug: string,
	filters: ProductFilters,
): Promise<boolean> {
	if (shouldNoindexFilteredCategoryPage(rawSearchParams, categorySlug, filters)) {
		return true;
	}

	const brandOnly = parseBrandOnlyFilter(rawSearchParams, categorySlug);
	if (!brandOnly) {
		return false;
	}

	return categoryBrandHasEligibleGradeIntent(brandOnly.categorySlug, brandOnly.brandSlug);
}
