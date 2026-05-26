"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, SlidersHorizontal, X } from "lucide-react";

import {
  attributeSlugsToClearOnFilterChange,
  classNames,
  compareAlphabetically,
  type Brand,
} from "@store/shared";
import type { StorefrontAttributeFacet } from "@/lib/storefront/facets";

import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  FILTER_PARAM_KEYS,
  isExpandGradesView,
} from "@/lib/storefront/filterParams";
import { useFilterParams } from "@/lib/storefront/useFilterParams";
import { useAttributesForCategory, useGrades } from "@/lib/storefront/storefrontReferenceContext";

/**
 * Filter sidebar (Phase 1 shared catalog axes).
 *
 * Filter groups (grade, brand, attributes) are alphabetical. Price stays
 * pinned at the bottom of the sidebar. Attribute option order is
 * alphabetical everywhere — no manual sort in admin. Sort UI was removed
 * by product request; the server falls back to the default "newest"
 * order whenever the URL has no `sort` param.
 */

interface FilterSidebarProps {
  /** Active category slug — drives which grades render. `undefined` = all. */
  categorySlug?: string;
  /** Live brand list from the DB, with product counts. */
  brands?: Brand[];
  /** Product counts per grade slug for the active category. */
  gradeCounts?: Record<string, number>;
  /** Server-rendered facets for the current URL (avoids empty first paint). */
  initialFacets?: StorefrontAttributeFacet[];
}

export function FilterSidebar({
  categorySlug,
  brands = [],
  gradeCounts = {},
  initialFacets = [],
}: FilterSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const filterApi = useFilterParams();
  const activeFilterCount = countActiveFilters(filterApi.params);

  return (
    <>
      <div className="flex-1 md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className={classNames(
            "flex h-9 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors active:bg-[var(--color-canvas-deep)]",
            activeFilterCount > 0
              ? "border-[var(--color-accent-400)]/70 bg-[var(--color-accent-50)]/90 text-[var(--color-accent-900)]"
              : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-800)]",
          )}
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 grid size-4 place-items-center rounded-full bg-[var(--color-accent-500)] text-[10px] font-bold text-[var(--color-ink-900)]">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <aside className="hidden md:sticky md:top-[calc(var(--desktop-header-h)+24px)] md:block md:h-[calc(100dvh-var(--desktop-header-h)-48px)]">
        <FilterPanel
          categorySlug={categorySlug}
          brands={brands}
          gradeCounts={gradeCounts}
          initialFacets={initialFacets}
        />
      </aside>

      <BottomSheet
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        title="Filter & sort"
        description="Narrow down by grade, brand and price."
        height="lg"
        footer={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="md"
              className="flex-1"
              onClick={() => {
                filterApi.clearAll();
              }}
            >
              Clear all
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-[2]"
              onClick={() => setIsMobileOpen(false)}
            >
              Show results
            </Button>
          </div>
        }
      >
        <FilterPanel
          categorySlug={categorySlug}
          brands={brands}
          gradeCounts={gradeCounts}
          initialFacets={initialFacets}
          isMobile
        />
      </BottomSheet>
    </>
  );
}

interface FilterPanelProps {
  isMobile?: boolean;
  categorySlug?: string;
  brands: Brand[];
  gradeCounts: Record<string, number>;
  initialFacets: StorefrontAttributeFacet[];
}

function FilterPanel({
  isMobile = false,
  categorySlug,
  brands,
  gradeCounts,
  initialFacets,
}: FilterPanelProps) {
  const filterApi = useFilterParams();
  const router = useRouter();
  const pathname = usePathname();
  const allGrades = useGrades();
  const categoryAttributes = useAttributesForCategory(categorySlug ?? "");
  const attributeNodes = useMemo(
    () =>
      categoryAttributes.map((attribute) => ({
        slug: attribute.slug,
        label: attribute.label,
        visibility: attribute.visibility ?? { type: "always" as const },
      })),
    [categoryAttributes],
  );

  const facetFetchKey = `${categorySlug ?? ""}:${filterApi.params.toString()}`;

  const grades = filterApi.getMulti(FILTER_PARAM_KEYS.grades);
  const brandSlugs = filterApi.getMulti(FILTER_PARAM_KEYS.brands);
  const minPriceParam = filterApi.getSingle(FILTER_PARAM_KEYS.minPrice) ?? "";
  const maxPriceParam = filterApi.getSingle(FILTER_PARAM_KEYS.maxPrice) ?? "";
  const expandGrades = isExpandGradesView(filterApi.params);

  const setExpandGrades = useCallback(
    (next: boolean) => {
      filterApi.setSingle(FILTER_PARAM_KEYS.expandGrades, next ? "1" : "");
    },
    [filterApi],
  );

  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);

  const clearDependentAttributes = useCallback(
    (next: URLSearchParams, changed: "brand" | "grade" | string) => {
      for (const slug of attributeSlugsToClearOnFilterChange(attributeNodes, changed)) {
        next.delete(`attr.${slug}`);
      }
    },
    [attributeNodes],
  );

  const toggleBrand = useCallback(
    (slug: string) => {
      const next = new URLSearchParams(filterApi.params.toString());
      const current = filterApi.getMulti(FILTER_PARAM_KEYS.brands);
      const set = new Set(current);
      if (set.has(slug)) {
        set.delete(slug);
      } else {
        set.add(slug);
      }
      if (set.size === 0) {
        next.delete(FILTER_PARAM_KEYS.brands);
      } else {
        next.set(FILTER_PARAM_KEYS.brands, Array.from(set).join(","));
      }
      clearDependentAttributes(next, "brand");
      filterApi.replaceParams(next);
    },
    [clearDependentAttributes, filterApi],
  );

  const toggleGrade = useCallback(
    (slug: string) => {
      const next = new URLSearchParams(filterApi.params.toString());
      const current = filterApi.getMulti(FILTER_PARAM_KEYS.grades);
      const set = new Set(current);
      if (set.has(slug)) {
        set.delete(slug);
      } else {
        set.add(slug);
      }
      if (set.size === 0) {
        next.delete(FILTER_PARAM_KEYS.grades);
      } else {
        next.set(FILTER_PARAM_KEYS.grades, Array.from(set).join(","));
      }
      clearDependentAttributes(next, "grade");
      filterApi.replaceParams(next);
    },
    [clearDependentAttributes, filterApi],
  );

  const toggleAttribute = useCallback(
    (attributeSlug: string, value: string) => {
      const paramKey = `attr.${attributeSlug}`;
      const next = new URLSearchParams(filterApi.params.toString());
      const current = filterApi.getMulti(paramKey);
      const set = new Set(current);
      if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      if (set.size === 0) {
        next.delete(paramKey);
      } else {
        next.set(paramKey, Array.from(set).join(","));
      }
      clearDependentAttributes(next, attributeSlug);
      filterApi.replaceParams(next);
    },
    [clearDependentAttributes, filterApi],
  );

  const visibleGrades = useMemo(() => {
    const selected = new Set(grades);
    const scoped = categorySlug
      ? allGrades.filter((descriptor) => descriptor.categorySlug === categorySlug)
      : allGrades;
    return [...scoped]
      .filter(
        (descriptor) =>
          (gradeCounts[descriptor.slug] ?? 0) > 0 || selected.has(descriptor.slug),
      )
      .sort((left, right) => compareAlphabetically(left.label, right.label));
  }, [allGrades, categorySlug, gradeCounts, grades]);

  const sortedBrands = useMemo(() => {
    const selected = new Set(brandSlugs);
    return [...brands]
      .filter((brand) => brand.productCount > 0 || selected.has(brand.slug))
      .sort((left, right) => compareAlphabetically(left.name, right.name));
  }, [brands, brandSlugs]);

  const applyPriceRange = () => {
    const next = new URLSearchParams(filterApi.params.toString());
    if (minPrice) {
      next.set(FILTER_PARAM_KEYS.minPrice, minPrice);
    } else {
      next.delete(FILTER_PARAM_KEYS.minPrice);
    }
    if (maxPrice) {
      next.set(FILTER_PARAM_KEYS.maxPrice, maxPrice);
    } else {
      next.delete(FILTER_PARAM_KEYS.maxPrice);
    }
    next.delete(FILTER_PARAM_KEYS.page);
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const filterGroups = (
    <div className={isMobile ? "sheet-stagger space-y-6" : "space-y-3 p-2.5 pb-3"}>
      {/* View mode (desktop only). Mobile renders this as segmented tabs
          above the grid (`GradeViewModeTabs`) — that placement is the
          mobile-native one, so we skip it here to avoid duplicating the
          control in the mobile filter bottom sheet. */}
      {!isMobile && (
        <>
          <FilterGroup title="View">
            <ViewToggle
              expandGrades={expandGrades}
              onChange={setExpandGrades}
            />
          </FilterGroup>
          <FilterDivider />
        </>
      )}

      <FilterGroup title="Grade">
        {visibleGrades.length === 0 ? (
          <p className="px-2 text-[12px] text-[var(--color-ink-500)]">
            No grades configured yet.
          </p>
        ) : (
          <div className="space-y-0.5">
            {visibleGrades.map((descriptor) => (
              <FilterCheckRow
                key={`${descriptor.categorySlug}:${descriptor.slug}`}
                label={descriptor.label}
                count={gradeCounts[descriptor.slug]}
                checked={grades.includes(descriptor.slug)}
                onToggle={() => toggleGrade(descriptor.slug)}
              />
            ))}
          </div>
        )}
      </FilterGroup>

      <FilterDivider />

      <FilterGroup title="Brand">
        {sortedBrands.length === 0 ? (
          <p className="px-2 text-[12px] text-[var(--color-ink-500)]">
            No brands available yet.
          </p>
        ) : (
          <div className="space-y-0.5">
            {sortedBrands.map((brand) => (
              <FilterCheckRow
                key={brand.slug}
                label={brand.name}
                count={brand.productCount}
                checked={brandSlugs.includes(brand.slug)}
                onToggle={() => toggleBrand(brand.slug)}
              />
            ))}
          </div>
        )}
      </FilterGroup>

      <FilterDivider />

      {categorySlug ? (
        <AttributeFacetGroups
          key={facetFetchKey}
          categorySlug={categorySlug}
          initialFacets={initialFacets}
          filterParams={filterApi.params}
          getMulti={filterApi.getMulti}
          onToggleAttribute={toggleAttribute}
        />
      ) : null}

      {!isMobile && countActiveFilters(filterApi.params) > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => filterApi.clearAll()}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold text-[var(--color-ink-700)] hover:border-[var(--color-ink-300)]"
          >
            <X size={12} />
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );

  const priceFooter = (
    <div className={isMobile ? "mt-6 border-t border-[var(--color-ink-100)] pt-4" : "border-t border-[var(--color-ink-100)] p-2.5"}>
      <FilterGroup title="Price">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PriceInput
              value={minPrice}
              onChange={setMinPrice}
              placeholder="Min"
              ariaLabel="Minimum price in rupees"
            />
            <span aria-hidden className="text-[var(--color-ink-300)]">
              –
            </span>
            <PriceInput
              value={maxPrice}
              onChange={setMaxPrice}
              placeholder="Max"
              ariaLabel="Maximum price in rupees"
            />
          </div>
          <button
            type="button"
            onClick={applyPriceRange}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[13px] font-semibold text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-accent-600)]"
          >
            <Check size={14} strokeWidth={2.6} />
            Apply
          </button>
        </div>
      </FilterGroup>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {filterGroups}
        {priceFooter}
      </>
    );
  }

  return (
    /* Concentric: inner FilterCheckRow --radius-md (8) sits ~10px
       from sidebar edge → outer 18 ≈ --radius-xl (20, within 2px). */
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-accent-200)]/45 bg-[var(--color-surface)] shadow-[0_1px_2px_var(--color-on-light-05),0_10px_28px_-12px_var(--color-on-light-10)]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {filterGroups}
      </div>
      <div className="shrink-0 bg-[var(--color-surface)]">{priceFooter}</div>
    </div>
  );
}

interface AttributeFacetGroupsProps {
  categorySlug: string;
  initialFacets: StorefrontAttributeFacet[];
  filterParams: URLSearchParams;
  getMulti: (key: string) => string[];
  onToggleAttribute: (attributeSlug: string, value: string) => void;
}

/** Remount when category/filters change so facet state resets without sync effects. */
function AttributeFacetGroups({
  categorySlug,
  initialFacets,
  filterParams,
  getMulti,
  onToggleAttribute,
}: AttributeFacetGroupsProps) {
  const [facets, setFacets] = useState<StorefrontAttributeFacet[]>(initialFacets);
  const [facetsLoading, setFacetsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams(filterParams.toString());
    query.set("category", categorySlug);
    fetch(`/api/storefront/facets?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Facets request failed");
        }
        const payload = (await response.json()) as {
          facets?: StorefrontAttributeFacet[];
        };
        setFacets(payload.facets ?? []);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setFacets([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setFacetsLoading(false);
        }
      });
    return () => controller.abort();
  }, [categorySlug, filterParams]);

  if (!facetsLoading && facets.length === 0) {
    return (
      <p className="max-w-prose px-2 text-[12px] leading-snug text-[var(--color-ink-500)]">
        No more products match your selection. Adjust or clear filters to see
        attribute options.
      </p>
    );
  }

  return (
    <>
      {facets.map((facet, attributeIndex) => {
        const selectedValues = getMulti(`attr.${facet.slug}`);
        return (
          <div key={facet.slug}>
            <FilterGroup title={facet.label}>
              {facetsLoading && facet.options.length === 0 ? (
                <p className="px-2 text-[12px] text-[var(--color-ink-500)]">
                  Loading options…
                </p>
              ) : facet.options.length === 0 ? (
                <p className="px-2 text-[12px] text-[var(--color-ink-500)]">
                  No values in current results.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {facet.options.map((option) => (
                    <FilterCheckRow
                      key={option.value}
                      label={option.label}
                      count={option.count}
                      checked={selectedValues.includes(option.value)}
                      onToggle={() => onToggleAttribute(facet.slug, option.value)}
                    />
                  ))}
                </div>
              )}
            </FilterGroup>
            {attributeIndex < facets.length - 1 && <FilterDivider />}
          </div>
        );
      })}
    </>
  );
}

/** Quick count of how many filter groups are currently set. */
function countActiveFilters(params: URLSearchParams): number {
  let activeCount = 0;
  for (const key of Object.values(FILTER_PARAM_KEYS)) {
    if (
      key === FILTER_PARAM_KEYS.sort ||
      key === FILTER_PARAM_KEYS.page ||
      key === FILTER_PARAM_KEYS.search
    ) {
      continue;
    }
    if (params.get(key)) {
      activeCount += 1;
    }
  }
  for (const key of Array.from(params.keys())) {
    if (key.startsWith("attr.") && params.get(key)) {
      activeCount += 1;
    }
  }
  return activeCount;
}

interface FilterGroupProps {
  title: string;
  children: React.ReactNode;
}

function FilterGroup({ title, children }: FilterGroupProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FilterDivider() {
  return <div className="h-px bg-[var(--color-ink-100)]" />;
}

interface PriceInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
}

function PriceInput({ value, onChange, placeholder, ariaLabel }: PriceInputProps) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ""))}
      className="h-9 w-full flex-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 text-[13px] font-medium text-[var(--color-ink-900)] outline-none transition-colors placeholder:font-normal placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-700)] focus:ring-2 focus:ring-[var(--color-accent-100)]"
    />
  );
}

interface ViewToggleProps {
  expandGrades: boolean;
  onChange: (next: boolean) => void;
}

/**
 * View-mode toggle for the desktop sidebar — a two-button segmented
 * pill that mirrors the mobile `GradeViewModeTabs`. Was previously
 * a checkbox-style row; the toggle reads as a mode switch rather
 * than an opt-in filter, which matches what the control actually does.
 */
function ViewToggle({ expandGrades, onChange }: ViewToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Listing view mode"
      className="inline-flex w-full items-center gap-1 rounded-full border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-1 text-[12.5px] font-semibold"
    >
      <ViewToggleTab
        label="By product"
        isActive={!expandGrades}
        onClick={() => {
          if (expandGrades) onChange(false);
        }}
      />
      <ViewToggleTab
        label="By grade"
        isActive={expandGrades}
        onClick={() => {
          if (!expandGrades) onChange(true);
        }}
      />
    </div>
  );
}

interface ViewToggleTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ViewToggleTab({ label, isActive, onClick }: ViewToggleTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={classNames(
        "flex flex-1 items-center justify-center rounded-full px-3 py-1.5 transition-colors",
        isActive
          ? "bg-[var(--color-surface)] text-[var(--color-accent-800)] shadow-[var(--shadow-sm)]"
          : "text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]",
      )}
    >
      {label}
    </button>
  );
}

interface FilterCheckRowProps {
  label: string;
  count?: number;
  checked: boolean;
  onToggle: () => void;
}

function FilterCheckRow({ label, count, checked, onToggle }: FilterCheckRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={classNames(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 py-1 text-[13.5px] transition-colors",
        checked
          ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-800)]"
          : "font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]",
      )}
    >
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={classNames(
            "grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors",
            checked
              ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] text-[var(--color-accent-800)] shadow-[var(--shadow-sm)] ring-2 ring-[var(--color-accent-400)]/25"
              : "border-[var(--color-ink-200)] bg-[var(--color-surface)]",
          )}
        >
          {checked && <Check size={12} strokeWidth={3} />}
        </span>
        <span>{label}</span>
      </span>
      {count !== undefined && (
        <span
          className={classNames(
            "text-[11.5px]",
            checked ? "text-[var(--color-accent-700)]" : "text-[var(--color-ink-400)]",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
