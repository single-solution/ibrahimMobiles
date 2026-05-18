"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  ConditionGrade,
  GradeDescriptor,
  Product,
  ProductCategory,
} from "@store/shared";

/**
 * Storefront reference data — the *taxonomy* the catalog is described by.
 *
 * Two collections feed every product card, filter sidebar, grade chip,
 * cart line link, and homepage section:
 *
 *   - **Grades**: condition slug → `GradeDescriptor` (label, copy, tone).
 *   - **Categories**: stable id (`phone`/`accessory`/`gadget`) → admin-
 *     editable label, plural label, URL `pathSegment`, applicable grades,
 *     trust chips, etc.
 *
 * Both are resolved server-side once in the root layout from MongoDB (via
 * `getStorefrontGradesCached` / `getStorefrontCategoriesCached`) and
 * passed down via this provider. Client components consume them through
 * the hooks below — never by re-importing the legacy hardcoded tables.
 *
 * Defaults: empty arrays. The hooks have lookup helpers that return
 * `undefined` when the slug isn't known, so a UI rendered in isolation
 * (a Storybook story without this provider, say) degrades gracefully
 * instead of crashing.
 */
export interface StorefrontReferenceData {
  grades: GradeDescriptor[];
  categories: StorefrontCategoryReference[];
}

/**
 * Slim, serialisable view of a `Category` document — only the fields the
 * storefront UI actually needs. Kept narrow so additions to the Mongoose
 * schema don't accidentally leak through the SSR boundary.
 */
export interface StorefrontCategoryReference {
  id: ProductCategory;
  label: string;
  pluralLabel: string;
  pathSegment: string;
  isActive: boolean;
  tagline: string;
  applicableGrades: ConditionGrade[];
  trustChips: string[];
  emptyHint: string;
  sortOrder: number;
}

const EMPTY_REFERENCE: StorefrontReferenceData = {
  grades: [],
  categories: [],
};

const StorefrontReferenceContext = createContext<StorefrontReferenceData>(EMPTY_REFERENCE);

interface ProviderProps {
  value: StorefrontReferenceData;
  children: ReactNode;
}

export function StorefrontReferenceProvider({ value, children }: ProviderProps) {
  return (
    <StorefrontReferenceContext.Provider value={value}>
      {children}
    </StorefrontReferenceContext.Provider>
  );
}

/* ─────────── grades ─────────── */

export function useGrades(): GradeDescriptor[] {
  return useContext(StorefrontReferenceContext).grades;
}

/**
 * Lookup helper that returns the descriptor for a known grade slug, or
 * `undefined` when the grade isn't in the current set. Components should
 * fall back to a neutral label / no chip when this returns nothing — the
 * catalog enum can outpace admin edits in edge cases.
 */
export function useGrade(grade: ConditionGrade): GradeDescriptor | undefined {
  const grades = useGrades();
  return useMemo(
    () => grades.find((descriptor) => descriptor.grade === grade),
    [grades, grade],
  );
}

/* ─────────── categories ─────────── */

export function useCategories(): StorefrontCategoryReference[] {
  return useContext(StorefrontReferenceContext).categories;
}

export function useCategory(id: ProductCategory): StorefrontCategoryReference | undefined {
  const categories = useCategories();
  return useMemo(
    () => categories.find((category) => category.id === id),
    [categories, id],
  );
}

/**
 * Resolve a category id to its current URL segment (`phones` / `accessories`
 * / `gadgets`, or whatever the admin renamed it to). Used by the cart
 * dropdown, cart view, and any other place that builds a product link
 * outside a `<ProductCard>`.
 */
export function useCategorySegment(id: ProductCategory): string {
  const category = useCategory(id);
  return category?.pathSegment ?? defaultPathSegmentFor(id);
}

/** Build a `/shop/<category>/<slug>` link for a product, from context. */
export function useProductHref(
  product: Pick<Product, "category" | "slug">,
): string {
  const segment = useCategorySegment(product.category);
  return `/shop/${segment}/${product.slug}`;
}

/**
 * Fallback path segment when categories haven't loaded yet (Storybook,
 * the brief window before hydration on a CSR-only render, etc.). Mirrors
 * the historical hardcoded mapping so a missing context never breaks
 * navigation — it just renders the canonical fallback URLs.
 */
function defaultPathSegmentFor(id: ProductCategory): string {
  switch (id) {
    case "phone":
      return "phones";
    case "accessory":
      return "accessories";
    case "gadget":
      return "gadgets";
  }
}
