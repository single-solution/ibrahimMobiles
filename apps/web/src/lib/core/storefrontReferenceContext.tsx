"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { compareAlphabetically, sortAttributeOptions, type AttributeDescriptor, type GradeDescriptor, type Product, type Variant } from "@store/shared";

import { catalogRootHref, firstCategoryHref, productHref } from "@/lib/catalog/productPaths";
import type { CategoryMeta } from "@/lib/core";

/**
 * Storefront reference data — the *taxonomy* the catalog is described by.
 *
 * Two collections feed every product card, filter sidebar, grade chip,
 * cart line link, and homepage section:
 *
 *   - **Grades**: `(categorySlug, slug)` → `GradeDescriptor`.
 *   - **Categories**: slug → admin-editable label, description, icon.
 *
 * Both are resolved server-side once in the root layout from MongoDB (via
 * `getGradesCached` / `getCategoriesCached`) and
 * passed down via this provider. Client components consume them through
 * the hooks below — never by re-importing legacy hardcoded tables.
 *
 * Defaults: empty arrays. The hooks have lookup helpers that return
 * `undefined` when the slug isn't known, so a UI rendered in isolation
 * (a Storybook story without this provider, say) degrades gracefully
 * instead of crashing.
 */
export interface ReferenceData {
	grades: GradeDescriptor[];
	attributes: AttributeDescriptor[];
	categories: CategoryReference[];
}

/**
 * Slim, serialisable view of a `Category` document — only the fields the
 * storefront UI actually needs. Kept narrow so additions to the Mongoose
 * schema don't accidentally leak through the SSR boundary.
 */
export interface CategoryReference {
	slug: string;
	label: string;
	description: string;
	icon: CategoryMeta["icon"];
	iconNode: CategoryMeta["iconNode"];
	isActive: boolean;
	sortOrder: number;
}

const EMPTY_REFERENCE: ReferenceData = {
	grades: [],
	attributes: [],
	categories: [],
};

const ReferenceContext = createContext<ReferenceData>(EMPTY_REFERENCE);

interface ProviderProps {
	value: ReferenceData;
	children: ReactNode;
}

export function ReferenceProvider({ value, children }: ProviderProps) {
	return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>;
}

/* ─────────── grades ─────────── */

export function useGrades(): GradeDescriptor[] {
	return useContext(ReferenceContext).grades;
}

/**
 * Lookup helper that returns the descriptor for a `(categorySlug,
 * gradeSlug)` pair, or `undefined` when the grade isn't in the current
 * set. Components should fall back to a neutral label / no chip when
 * this returns nothing — the catalog can outpace admin edits in edge
 * cases.
 */
export function useGrade(categorySlug: string, gradeSlug: string): GradeDescriptor | undefined {
	const grades = useGrades();
	return useMemo(() => grades.find((descriptor) => descriptor.categorySlug === categorySlug && descriptor.slug === gradeSlug), [grades, categorySlug, gradeSlug]);
}

/** All grades that apply to a given category, in storefront display order. */
export function useGradesForCategory(categorySlug: string): GradeDescriptor[] {
	const grades = useGrades();
	return useMemo(
		() => grades.filter((descriptor) => descriptor.categorySlug === categorySlug).sort((left, right) => compareAlphabetically(left.label, right.label)),
		[grades, categorySlug],
	);
}

export function useAttributes(): AttributeDescriptor[] {
	return useContext(ReferenceContext).attributes;
}

export function useAttributesForCategory(categorySlug: string): AttributeDescriptor[] {
	const attributes = useAttributes();
	return useMemo(
		() =>
			attributes
				.filter((attribute) => attribute.categorySlug === categorySlug)
				.map((attribute) => ({
					...attribute,
					options: sortAttributeOptions(attribute.options, attribute.unit),
				}))
				.sort((left, right) => compareAlphabetically(left.label, right.label)),
		[attributes, categorySlug],
	);
}

/* ─────────── categories ─────────── */

export function useCategories(): CategoryReference[] {
	return useContext(ReferenceContext).categories;
}

export function useCategory(slug: string): CategoryReference | undefined {
	const categories = useCategories();
	return useMemo(() => categories.find((category) => category.slug === slug), [categories, slug]);
}

/**
 * Storefront catalog home — first active category (matches `/` redirect).
 */
export function useShopHref(): string {
	const categories = useCategories();
	return useMemo(() => firstCategoryHref(categories) ?? catalogRootHref(), [categories]);
}

/** True when `pathname` is the catalog home (`/` or the default category route). */
export function useIsCatalogHome(pathname: string): boolean {
	const homeHref = useShopHref();
	return pathname === "/" || pathname === homeHref;
}

/** Category slug is the URL segment — identity wrapper for storefront path helpers. */
export function useCategorySegment(categorySlug: string): string {
	return categorySlug;
}

/** Build a `/shop/<category>/<slug>` link for a product, from context. */
export function useProductHref(product: Pick<Product, "categorySlug" | "slug">, variant?: Variant): string {
	if (!product.categorySlug || !product.slug) {
		return catalogRootHref();
	}
	return productHref(product, variant ? { variant } : undefined);
}
