import type { Metadata } from "next";
import { ChevronDown, Grid3x3, LayoutList } from "lucide-react";
import { VariantCard } from "@/components/shared/VariantCard";
import { FilterSidebar } from "@/components/shared/FilterSidebar";
import { Pill } from "@/components/ui/Pill";
import { phones } from "@/data/phones";
import type { Phone, PhoneVariant } from "@/types";

export const metadata: Metadata = {
  title: "Shop pre-owned phones",
  description: "Browse our full range of graded pre-owned phones — by brand, condition and price.",
};

const ACTIVE_FILTERS_PREVIEW = [
  { label: "Apple", group: "Brand" },
  { label: "Grade A & A+", group: "Condition" },
  { label: "Under Rs 200,000", group: "Price" },
];

interface PhoneVariantPair {
  phone: Phone;
  variant: PhoneVariant;
}

function getAllVariants(): PhoneVariantPair[] {
  return phones.flatMap((phone) =>
    phone.variants.map((variant) => ({ phone, variant })),
  );
}

export default function ShopPage() {
  const allVariants = getAllVariants();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <FilterSidebar />

        <div className="space-y-6">
          <ActiveFilters />
          <ResultsToolbar resultCount={allVariants.length} modelCount={phones.length} />
          <VariantGrid variantPairs={allVariants} />
          <Pagination />
        </div>
      </div>
    </div>
  );
}

function ActiveFilters() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-500)]">
      <span className="font-medium">Active filters:</span>
      {ACTIVE_FILTERS_PREVIEW.map((activeFilter) => (
        <Pill key={activeFilter.label} tone="outline" size="md" className="cursor-pointer">
          {activeFilter.group}: {activeFilter.label} <span className="ml-1 opacity-60">×</span>
        </Pill>
      ))}
      <button
        type="button"
        className="ml-1 text-[var(--color-accent-700)] hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}

interface ResultsToolbarProps {
  resultCount: number;
  modelCount: number;
}

function ResultsToolbar({ resultCount, modelCount }: ResultsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--color-ink-100)] py-3">
      <p className="text-sm text-[var(--color-ink-600)]">
        Showing <span className="font-semibold text-[var(--color-ink-900)]">{resultCount}</span>{" "}
        units across {modelCount} models
      </p>
      <div className="flex items-center gap-3">
        <SortDropdown />
        <ViewToggle />
      </div>
    </div>
  );
}

function SortDropdown() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-ink-800)] hover:border-[var(--color-ink-300)]"
    >
      <span className="text-[var(--color-ink-500)]">Sort:</span>
      <span>Recommended</span>
      <ChevronDown size={14} />
    </button>
  );
}

function ViewToggle() {
  return (
    <div
      className="flex rounded-[var(--radius-md)] border border-[var(--color-ink-200)] p-0.5"
      role="group"
      aria-label="View"
    >
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed="true"
        className="grid size-8 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-700)] text-white"
      >
        <Grid3x3 size={14} />
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed="false"
        className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]"
      >
        <LayoutList size={14} />
      </button>
    </div>
  );
}

interface VariantGridProps {
  variantPairs: PhoneVariantPair[];
}

function VariantGrid({ variantPairs }: VariantGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-3">
      {variantPairs.map(({ phone, variant }) => (
        <VariantCard key={variant.id} phone={phone} variant={variant} />
      ))}
    </div>
  );
}

function Pagination() {
  const pages = [1, 2, 3];
  return (
    <nav className="flex items-center justify-center gap-1 pt-4" aria-label="Pagination">
      <PageButton label="Previous" disabled />
      {pages.map((pageNumber) => (
        <PageButton
          key={pageNumber}
          label={String(pageNumber)}
          isActive={pageNumber === 1}
        />
      ))}
      <span className="px-2 text-sm text-[var(--color-ink-400)]">…</span>
      <PageButton label="6" />
      <PageButton label="Next" />
    </nav>
  );
}

interface PageButtonProps {
  label: string;
  isActive?: boolean;
  disabled?: boolean;
}

function PageButton({ label, isActive = false, disabled = false }: PageButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={isActive ? "page" : undefined}
      className={
        isActive
          ? "h-9 rounded-[var(--radius-md)] bg-[var(--color-accent-700)] px-3 text-sm font-semibold text-white"
          : "h-9 rounded-[var(--radius-md)] px-3 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-surface-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
      }
    >
      {label}
    </button>
  );
}
