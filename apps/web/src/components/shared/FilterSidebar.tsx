"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, SlidersHorizontal, X } from "lucide-react";

import { classNames, type Brand } from "@store/shared";

import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FILTER_PARAM_KEYS } from "@/lib/storefront/filterParams";
import { useFilterParams } from "@/lib/storefront/useFilterParams";
import { useGrades } from "@/lib/storefront/storefrontReferenceContext";

/**
 * Filter sidebar (Phase 1 universal axes).
 *
 * Schema awareness (PLAN.md §10):
 *   - The catalog is admin-authored, so per-category filter axes
 *     (storage / RAM / battery / connector / wattage / gadgetType / PTA)
 *     no longer live in code. They become *generic* attribute filters
 *     in Phase 3 (Categories workspace) — driven by the active category's
 *     `Attribute` collection — keyed in the URL as `attr.<slug>=value`.
 *   - For Phase 1 this component is reduced to the universal axes:
 *     brand, grade, price (and the existing "in stock" toggle is owned
 *     by the page chrome, not this sidebar).
 *   - Grades displayed are the ones admin has defined for the active
 *     category. With "all" we list every grade across categories.
 */

interface FilterSidebarProps {
  /** Active category slug — drives which grades render. `undefined` = all. */
  categorySlug?: string;
  /** Live brand list from the DB, with product counts. */
  brands?: Brand[];
}

export function FilterSidebar({ categorySlug, brands = [] }: FilterSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const filterApi = useFilterParams();
  const activeFilterCount = countActiveFilters(filterApi.params);

  return (
    <>
      <div className="flex-1 md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-[13px] font-medium text-[var(--color-ink-800)] active:bg-[var(--color-canvas-deep)]"
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 grid size-4 place-items-center rounded-full bg-[var(--color-accent-700)] text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <aside className="hidden md:sticky md:top-[calc(var(--desktop-header-h)+24px)] md:block md:h-[calc(100dvh-var(--desktop-header-h)-48px)]">
        <FilterPanel categorySlug={categorySlug} brands={brands} />
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
        <FilterPanel categorySlug={categorySlug} brands={brands} isMobile />
      </BottomSheet>
    </>
  );
}

interface FilterPanelProps {
  isMobile?: boolean;
  categorySlug?: string;
  brands: Brand[];
}

function FilterPanel({ isMobile = false, categorySlug, brands }: FilterPanelProps) {
  const filterApi = useFilterParams();
  const router = useRouter();
  const pathname = usePathname();
  const allGrades = useGrades();

  const grades = filterApi.getMulti(FILTER_PARAM_KEYS.grades);
  const brandSlugs = filterApi.getMulti(FILTER_PARAM_KEYS.brands);
  const minPriceParam = filterApi.getSingle(FILTER_PARAM_KEYS.minPrice) ?? "";
  const maxPriceParam = filterApi.getSingle(FILTER_PARAM_KEYS.maxPrice) ?? "";

  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);

  // When viewing a specific category, only its grades. When viewing "all"
  // (no `categorySlug`), surface every grade — duplicates by slug collapse
  // because admin scopes grades by category and labels are usually unique.
  const visibleGrades = useMemo(() => {
    if (!categorySlug) {
      return allGrades;
    }
    return allGrades.filter((descriptor) => descriptor.categorySlug === categorySlug);
  }, [allGrades, categorySlug]);

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

  const content = (
    <div className={isMobile ? "sheet-stagger space-y-6" : "space-y-3 p-2.5"}>
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
                checked={grades.includes(descriptor.slug)}
                onToggle={() =>
                  filterApi.toggleInMulti(FILTER_PARAM_KEYS.grades, descriptor.slug)
                }
              />
            ))}
          </div>
        )}
      </FilterGroup>

      <FilterDivider />

      <FilterGroup title="Brand">
        {brands.length === 0 ? (
          <p className="px-2 text-[12px] text-[var(--color-ink-500)]">
            No brands available yet.
          </p>
        ) : (
          <div className="space-y-0.5">
            {brands.map((brand) => (
              <FilterCheckRow
                key={brand.slug}
                label={brand.name}
                count={brand.productCount}
                checked={brandSlugs.includes(brand.slug)}
                onToggle={() =>
                  filterApi.toggleInMulti(FILTER_PARAM_KEYS.brands, brand.slug)
                }
              />
            ))}
          </div>
        )}
      </FilterGroup>

      <FilterDivider />

      <FilterGroup title="Price">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PriceInput
              value={minPrice}
              onChange={setMinPrice}
              placeholder="Min"
              ariaLabel="Minimum price in rupees"
            />
            <span aria-hidden className="text-[var(--color-ink-300)]">–</span>
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

      {!isMobile && countActiveFilters(filterApi.params) > 0 && (
        <div className="pt-2">
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

  if (isMobile) {
    return content;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {content}
      </div>
    </div>
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
              ? "border-[var(--color-accent-700)] bg-[var(--color-accent-700)] text-white"
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
