"use client";

import Link from "next/link";

import { gradeGlossaryHref } from "@/lib/catalog/glossaryPaths";
import { FILTER_PARAM_KEYS } from "@/lib/core/filterParams";
import { useGrades } from "@/lib/core/storefrontReferenceContext";
import { useFilterParams } from "@/lib/core/useFilterParams";

interface GradeGlossaryCueProps {
	categorySlug: string;
	className?: string;
}

/** Links to the grade glossary when exactly one grade filter is active. */
export function GradeGlossaryCue({ categorySlug, className }: GradeGlossaryCueProps) {
	const filterApi = useFilterParams();
	const allGrades = useGrades();
	const gradeSlugs = filterApi.getMulti(FILTER_PARAM_KEYS.grades);

	if (gradeSlugs.length !== 1) {
		return null;
	}

	const gradeSlug = gradeSlugs[0]!;
	const descriptor = allGrades.find((entry) => entry.categorySlug === categorySlug && entry.slug === gradeSlug);
	const label = descriptor?.label ?? gradeSlug;

	return (
		<Link
			href={gradeGlossaryHref(categorySlug, gradeSlug)}
			className={className ?? "tap text-[12px] font-medium text-[var(--color-accent-700)] underline-offset-2 hover:underline md:text-[13px]"}
		>
			What is {label}?
		</Link>
	);
}
