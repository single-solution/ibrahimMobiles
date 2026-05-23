"use client";

import { ChevronDown } from "lucide-react";
import {
  FILTER_PARAM_KEYS,
  isExpandVariantsView,
} from "@/lib/storefront/filterParams";
import { useFilterParams } from "@/lib/storefront/useFilterParams";
import type { StorefrontSort } from "@/lib/storefront/queries";

/** Shop-facing sort options only — hero uses `recently-updated` internally. */
const SORT_LABELS: Record<Exclude<StorefrontSort, "recently-updated">, string> = {
  newest: "Recommended",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "name-asc": "Name (A–Z)",
};

const SORT_OPTIONS: Exclude<StorefrontSort, "recently-updated">[] = [
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
];

/**
 * Client-controlled sort selector. Drives the `sort` URL param read by the
 * server-rendered shop page; the page re-renders with the new sort applied.
 *
 * We use a plain `<select>` for native mobile UX (system picker) and style
 * the wrapper to look like the rest of the design language.
 */
export function SortDropdown() {
  const { getSingle, setSingle, params } = useFilterParams();
  const raw = getSingle(FILTER_PARAM_KEYS.sort) as StorefrontSort | undefined;
  const value: Exclude<StorefrontSort, "recently-updated"> =
    raw && raw !== "recently-updated" ? raw : "newest";
  const expandVariants = isExpandVariantsView(params);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-[13px] font-medium text-[var(--color-ink-800)] hover:border-[var(--color-ink-300)] md:h-auto md:rounded-[var(--radius-md)] md:px-3.5 md:py-2 md:text-sm">
        <span className="text-[var(--color-ink-500)]">By variation</span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Show each variation as its own product card"
          checked={expandVariants}
          onChange={(event) => {
            setSingle(
              FILTER_PARAM_KEYS.expandVariants,
              event.target.checked ? "" : "0",
            );
          }}
          className="size-4 accent-[var(--color-accent-600)]"
        />
      </label>
      <label className="relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-[13px] font-medium text-[var(--color-ink-800)] hover:border-[var(--color-ink-300)] md:h-auto md:rounded-[var(--radius-md)] md:px-3.5 md:py-2 md:text-sm">
        <span className="text-[var(--color-ink-500)]">Sort</span>
        <span>{SORT_LABELS[value]}</span>
        <ChevronDown size={13} aria-hidden />
        <select
          aria-label="Sort products"
          value={value}
          onChange={(event) => {
            const next = event.target.value as Exclude<
              StorefrontSort,
              "recently-updated"
            >;
            setSingle(FILTER_PARAM_KEYS.sort, next === "newest" ? "" : next);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
