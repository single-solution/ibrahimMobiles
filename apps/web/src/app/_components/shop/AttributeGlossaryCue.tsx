"use client";

import Link from "next/link";

import { attributeGlossaryHref } from "@/lib/catalog/glossaryPaths";
import { ATTRIBUTE_PARAM_PREFIX } from "@/lib/core/filterParams";
import { useAttributesForCategory } from "@/lib/core/storefrontReferenceContext";
import { useFilterParams } from "@/lib/core/useFilterParams";

interface AttributeGlossaryCueProps {
	categorySlug: string;
	className?: string;
}

/** Links to the attribute glossary when exactly one attribute filter is active. */
export function AttributeGlossaryCue({ categorySlug, className }: AttributeGlossaryCueProps) {
	const filterApi = useFilterParams();
	const categoryAttributes = useAttributesForCategory(categorySlug);

	const attributeFilters: Array<{ slug: string; values: string[] }> = [];
	for (const key of filterApi.params.keys()) {
		if (!key.startsWith(ATTRIBUTE_PARAM_PREFIX)) {
			continue;
		}
		const slug = key.slice(ATTRIBUTE_PARAM_PREFIX.length);
		const values = filterApi.getMulti(key);
		if (values.length > 0) {
			attributeFilters.push({ slug, values });
		}
	}

	if (attributeFilters.length !== 1 || attributeFilters[0]!.values.length !== 1) {
		return null;
	}

	const attributeSlug = attributeFilters[0]!.slug;
	const descriptor = categoryAttributes.find((entry) => entry.slug === attributeSlug);
	const label = descriptor?.label ?? attributeSlug;

	return (
		<Link
			href={attributeGlossaryHref(categorySlug, attributeSlug)}
			className={className ?? "tap text-[12px] font-medium text-[var(--color-accent-700)] underline-offset-2 hover:underline md:text-[13px]"}
		>
			What is {label}?
		</Link>
	);
}
