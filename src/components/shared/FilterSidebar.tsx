"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { StockTypeBadge } from "@/components/shared/StockTypeBadge";
import { brands } from "@/data/brands";
import { gradeDescriptors } from "@/data/grades";
import { stockTypeDescriptors } from "@/data/stockTypes";
import { PRICE_FILTER_BUCKETS, RAM_OPTIONS, STORAGE_OPTIONS } from "@/lib/constants";
import { classNames } from "@/lib/utils";
import type { ConditionGrade } from "@/types";

const CONDITION_FILTERS: ConditionGrade[] = ["A+", "A", "B", "C"];

export function FilterSidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  function handleMobileToggle() {
    setIsMobileOpen((previous) => !previous);
  }

  return (
    <>
      <div className="lg:hidden">
        <Button
          variant="outline"
          size="md"
          leadingIcon={<Filter size={16} />}
          onClick={handleMobileToggle}
          className="w-full"
        >
          Filter results
        </Button>
      </div>

      <aside
        className={classNames(
          "lg:sticky lg:top-28 lg:block",
          isMobileOpen
            ? "fixed inset-0 z-40 flex flex-col overflow-y-auto bg-[var(--color-canvas)] p-6"
            : "hidden",
        )}
      >
        {isMobileOpen && (
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <h2 className="text-lg font-semibold">Filters</h2>
            <button
              type="button"
              aria-label="Close filters"
              onClick={handleMobileToggle}
              className="grid size-9 place-items-center rounded-[var(--radius-md)] hover:bg-[var(--color-surface-muted)]"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5">
          <FilterGroup title="Condition grade">
            <div className="flex flex-wrap gap-2">
              {CONDITION_FILTERS.map((conditionGrade) => (
                <FilterPill key={conditionGrade}>
                  <GradeBadge grade={conditionGrade} size="sm" showLabel />
                </FilterPill>
              ))}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="Stock type">
            <div className="flex flex-wrap gap-1.5">
              {stockTypeDescriptors.map((descriptor) => (
                <FilterPill key={descriptor.stockType}>
                  <StockTypeBadge stockType={descriptor.stockType} size="sm" />
                </FilterPill>
              ))}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="Brand">
            <div className="space-y-2">
              {brands.map((brand) => (
                <FilterCheckbox key={brand.slug} label={brand.name} count={brand.phoneCount} />
              ))}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="Price">
            <div className="space-y-2">
              {PRICE_FILTER_BUCKETS.map((priceBucket) => (
                <FilterCheckbox key={priceBucket.id} label={priceBucket.label} />
              ))}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="Storage">
            <div className="flex flex-wrap gap-2">
              {STORAGE_OPTIONS.map((storageGb) => (
                <FilterPill key={storageGb}>
                  {storageGb >= 1024 ? `${storageGb / 1024} TB` : `${storageGb} GB`}
                </FilterPill>
              ))}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="RAM">
            <div className="flex flex-wrap gap-2">
              {RAM_OPTIONS.map((ramGb) => (
                <FilterPill key={ramGb}>{ramGb} GB</FilterPill>
              ))}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="Other">
            <div className="space-y-2">
              <FilterCheckbox label="On sale only" />
              <FilterCheckbox label="In stock only" defaultChecked />
              <FilterCheckbox label="Battery health 90%+" />
              <FilterCheckbox label="With original box" />
            </div>
          </FilterGroup>

          <div className="flex gap-2 pt-2">
            <Button variant="primary" size="sm" className="flex-1">
              Apply
            </Button>
            <Button variant="ghost" size="sm">
              Clear
            </Button>
          </div>
        </div>

        <details className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-ink-600)]">
          <summary className="cursor-pointer font-medium text-[var(--color-ink-800)]">
            What do the grades mean?
          </summary>
          <ul className="mt-3 space-y-2.5">
            {gradeDescriptors.map((descriptor) => (
              <li key={descriptor.grade} className="flex gap-2.5">
                <GradeBadge grade={descriptor.grade} size="sm" />
                <span className="text-xs leading-relaxed">{descriptor.description}</span>
              </li>
            ))}
          </ul>
        </details>
      </aside>
    </>
  );
}

interface FilterGroupProps {
  title: string;
  children: React.ReactNode;
}

function FilterGroup({ title, children }: FilterGroupProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FilterDivider() {
  return <div className="h-px bg-[var(--color-ink-100)]" />;
}

interface FilterPillProps {
  children: React.ReactNode;
}

function FilterPill({ children }: FilterPillProps) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] transition-colors hover:border-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-white"
    >
      {children}
    </button>
  );
}

interface FilterCheckboxProps {
  label: string;
  count?: number;
  defaultChecked?: boolean;
}

function FilterCheckbox({ label, count, defaultChecked }: FilterCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] py-1 text-sm text-[var(--color-ink-700)] hover:text-[var(--color-ink-900)]">
      <span className="flex items-center gap-2.5">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="size-4 rounded border-[var(--color-ink-300)] text-[var(--color-accent-600)] focus:ring-[var(--color-accent-500)]"
        />
        <span>{label}</span>
      </span>
      {count !== undefined && (
        <span className="text-xs text-[var(--color-ink-400)]">{count}</span>
      )}
    </label>
  );
}
