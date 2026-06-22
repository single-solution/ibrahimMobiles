"use client";

import { useMemo } from "react";
import { X } from "lucide-react";

import { classNames, formatPrice } from "@store/shared";

import { isPriceFilterActive, useAttributeFacets, useListingFilterMutations, type ShopFilterDataProps } from "@/components/shared/FilterSidebar";
import { FILTER_PARAM_KEYS } from "@/lib/core/filterParams";
import { useFilterParams } from "@/lib/core/useFilterParams";
import { useGrades } from "@/lib/core/storefrontReferenceContext";

interface ActiveFilterChip {
	key: string;
	label: string;
	onRemove: () => void;
}

interface ShopActiveFilterChipsProps extends ShopFilterDataProps {
	className?: string;
}

/** Removable chips for every active listing filter — visible without opening dropdowns. */
export function ShopActiveFilterChips({ categorySlug, brands = [], initialFacets = [], className }: ShopActiveFilterChipsProps) {
	const filterApi = useFilterParams();
	const allGrades = useGrades();
	const { removeFromMulti, clearPrice, clearAll, params } = useListingFilterMutations(categorySlug);
	const { facets } = useAttributeFacets(categorySlug ?? "", params, initialFacets);

	const gradeSlugs = filterApi.getMulti(FILTER_PARAM_KEYS.grades);
	const brandSlugs = filterApi.getMulti(FILTER_PARAM_KEYS.brands);
	const minPrice = filterApi.getSingle(FILTER_PARAM_KEYS.minPrice);
	const maxPrice = filterApi.getSingle(FILTER_PARAM_KEYS.maxPrice);

	const chips = useMemo(() => {
		if (!categorySlug) {
			return [];
		}

		const next: ActiveFilterChip[] = [];

		for (const gradeSlug of gradeSlugs) {
			const descriptor = allGrades.find((entry) => entry.categorySlug === categorySlug && entry.slug === gradeSlug);
			next.push({
				key: `grade:${gradeSlug}`,
				label: descriptor?.label ?? gradeSlug,
				onRemove: () => removeFromMulti(FILTER_PARAM_KEYS.grades, gradeSlug),
			});
		}

		for (const brandSlug of brandSlugs) {
			const brand = brands.find((entry) => entry.slug === brandSlug);
			next.push({
				key: `brand:${brandSlug}`,
				label: brand?.name ?? brandSlug,
				onRemove: () => removeFromMulti(FILTER_PARAM_KEYS.brands, brandSlug),
			});
		}

		for (const key of Array.from(params.keys())) {
			if (!key.startsWith("attr.")) {
				continue;
			}
			const attributeSlug = key.slice(5);
			const facet = facets.find((entry) => entry.slug === attributeSlug);
			const values = filterApi.getMulti(key);
			for (const value of values) {
				const option = facet?.options.find((entry) => entry.value === value);
				const valueLabel = option?.label ?? value;
				const label = facet ? `${facet.label}: ${valueLabel}` : valueLabel;
				next.push({
					key: `${key}:${value}`,
					label,
					onRemove: () => removeFromMulti(key, value),
				});
			}
		}

		if (isPriceFilterActive(params)) {
			next.push({
				key: "price",
				label: formatPriceFilterLabel(minPrice, maxPrice),
				onRemove: clearPrice,
			});
		}

		return next;
	}, [allGrades, brandSlugs, brands, categorySlug, clearPrice, facets, filterApi, gradeSlugs, maxPrice, minPrice, params, removeFromMulti]);

	if (chips.length === 0) {
		return null;
	}

	return (
		<div className={classNames("reveal flex flex-wrap items-center gap-2", className)} aria-label="Active filters">
			{chips.map((chip) => (
				<button
					key={chip.key}
					type="button"
					onClick={chip.onRemove}
					className="shop-catalog-pill tap inline-flex max-w-full items-center gap-1 rounded-[var(--radius-full)] border border-[var(--color-accent-300)]/80 bg-[var(--color-accent-50)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-accent-900)] hover:border-[var(--color-accent-400)] hover:bg-[var(--color-accent-100)] md:text-[12px]"
				>
					<span className="truncate">{chip.label}</span>
					<X size={12} strokeWidth={2.4} aria-hidden className="shrink-0 opacity-70" />
					<span className="sr-only">Remove {chip.label}</span>
				</button>
			))}
			{chips.length > 1 ? (
				<button
					type="button"
					onClick={clearAll}
					className="tap text-[11px] font-medium text-[var(--color-ink-500)] underline-offset-2 hover:text-[var(--color-ink-800)] hover:underline md:text-[12px]"
				>
					Clear all
				</button>
			) : null}
		</div>
	);
}

function formatPriceFilterLabel(minPrice?: string, maxPrice?: string): string {
	const min = minPrice ? Number.parseInt(minPrice, 10) : undefined;
	const max = maxPrice ? Number.parseInt(maxPrice, 10) : undefined;
	if (min !== undefined && max !== undefined) {
		return `${formatPrice(min)} – ${formatPrice(max)}`;
	}
	if (min !== undefined) {
		return `From ${formatPrice(min)}`;
	}
	if (max !== undefined) {
		return `Up to ${formatPrice(max)}`;
	}
	return "Price";
}
