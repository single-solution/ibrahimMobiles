"use client";

import { useMemo } from "react";

import { FilterDropdown } from "@/components/shared/FilterDropdown";

import {
	FilterPanel,
	countActiveAttributeFilters,
	countMultiParam,
	isPriceFilterActive,
	shouldShowMoreAttributeFilters,
	type ShopFilterDataProps,
} from "@/components/shared/FilterSidebar";

import { FILTER_PARAM_KEYS } from "@/lib/core/filterParams";

import { useFilterParams } from "@/lib/core/useFilterParams";

import { useAttributesForCategory, useGrades } from "@/lib/core/storefrontReferenceContext";

function panelProps(data: ShopFilterDataProps) {
	return {
		categorySlug: data.categorySlug,

		brands: data.brands ?? [],

		gradeCounts: data.gradeCounts ?? {},

		initialFacets: data.initialFacets ?? [],

		layout: "plain" as const,

		showClearAll: false,
	};
}

function buildDropdownLabel(base: string, selectedLabels: string[]): string {
	if (selectedLabels.length === 0) {
		return base;
	}

	if (selectedLabels.length === 1) {
		return `${base}: ${selectedLabels[0]}`;
	}

	return `${base} (${selectedLabels.length})`;
}

/** Hybrid filters — Grade, Brand, Price exposed; attributes under More filters. */

export function ShopFilterRow({
	categorySlug,

	brands = [],

	gradeCounts,

	initialFacets,
}: ShopFilterDataProps) {
	const filterApi = useFilterParams();

	const params = filterApi.params;

	const shared = panelProps({ categorySlug, brands, gradeCounts, initialFacets });

	const categoryAttributes = useAttributesForCategory(categorySlug ?? "");

	const allGrades = useGrades();

	const attributeNodes = useMemo(
		() =>
			categoryAttributes.map((attribute) => ({
				visibility: attribute.visibility,
			})),

		[categoryAttributes],
	);

	const attributeFilterCount = countActiveAttributeFilters(params);

	const showMoreFilters = shouldShowMoreAttributeFilters(params, attributeNodes);

	const gradeSlugs = filterApi.getMulti(FILTER_PARAM_KEYS.grades);

	const brandSlugs = filterApi.getMulti(FILTER_PARAM_KEYS.brands);

	const gradeLabels = useMemo(
		() =>
			gradeSlugs.map((slug) => {
				const descriptor = allGrades.find((entry) => entry.categorySlug === categorySlug && entry.slug === slug);

				return descriptor?.label ?? slug;
			}),

		[allGrades, categorySlug, gradeSlugs],
	);

	const brandLabels = useMemo(
		() => brandSlugs.map((slug) => brands.find((brand) => brand.slug === slug)?.name ?? slug),

		[brandSlugs, brands],
	);

	return (
		<div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 md:gap-2.5">
			<FilterDropdown label={buildDropdownLabel("Grade", gradeLabels)} activeCount={countMultiParam(params, FILTER_PARAM_KEYS.grades)}>
				<FilterPanel {...shared} sections={["grade"]} />
			</FilterDropdown>

			<FilterDropdown label={buildDropdownLabel("Brand", brandLabels)} activeCount={countMultiParam(params, FILTER_PARAM_KEYS.brands)}>
				<FilterPanel {...shared} sections={["brand"]} />
			</FilterDropdown>

			{showMoreFilters ? (
				<FilterDropdown
					label={attributeFilterCount > 0 ? `More filters (${attributeFilterCount})` : "More filters"}
					activeCount={attributeFilterCount}
					align="right"
					panelClassName="max-h-[min(480px,70vh)] w-[min(840px,calc(100vw-2rem))] min-w-[min(640px,calc(100vw-2rem))] p-3 md:p-4"
				>
					<FilterPanel {...shared} sections={["attributes"]} attributesLayout="grid" />
				</FilterDropdown>
			) : null}

			<FilterDropdown
				label="Price"
				activeCount={isPriceFilterActive(params) ? 1 : 0}
				align="right"
				panelClassName="max-h-[min(360px,52vh)] w-[min(280px,calc(100vw-2rem))] min-w-[min(240px,calc(100vw-2rem))]"
			>
				<FilterPanel {...shared} sections={["price"]} />
			</FilterDropdown>
		</div>
	);
}
