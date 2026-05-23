"use client";

import type { Product } from "@store/shared";

import { expandProductsByVariant } from "@/lib/catalog/expandProductVariants";
import {
  FILTER_PARAM_KEYS,
  hasActiveListingFilters,
  isExpandVariantsView,
} from "@/lib/storefront/filterParams";
import { useFilterParams } from "@/lib/storefront/useFilterParams";
import { resolveListingVariant } from "@/lib/productSummary";

import { ProductCard } from "./ProductCard";

interface ShopProductGridProps {
  products: Product[];
  categoryLabel: string;
}

export function ShopProductGrid({ products, categoryLabel }: ShopProductGridProps) {
  const { params } = useFilterParams();
  const expandVariants = isExpandVariantsView(params);
  const cards = expandVariants ? expandProductsByVariant(products) : products;
  const gradeSlugs = (params.get(FILTER_PARAM_KEYS.grades) ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  const filtersActive = hasActiveListingFilters(params);

  if (cards.length === 0) {
    return (
      <ShopListingEmptyState
        categoryLabel={categoryLabel}
        filtersActive={filtersActive}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
      {cards.map((product) => {
        const listingVariant = resolveListingVariant(product, { gradeSlugs });
        return (
          <div key={`${product.id}:${listingVariant.id}`} className="reveal">
            <ProductCard
              product={product}
              variantId={listingVariant.id}
              hideVariantCount={expandVariants}
            />
          </div>
        );
      })}
    </div>
  );
}

function ShopListingEmptyState({
  categoryLabel,
  filtersActive,
}: {
  categoryLabel: string;
  filtersActive: boolean;
}) {
  return (
    <div
      role="status"
      className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 px-5 py-12 text-center"
    >
      <p className="text-sm font-semibold text-[var(--color-ink-900)]">
        {filtersActive
          ? "No more products match your selection"
          : `No ${categoryLabel.toLowerCase()} in stock right now`}
      </p>
      <p className="mt-2 text-[13px] leading-snug text-[var(--color-ink-500)]">
        {filtersActive
          ? "Try clearing a filter or choosing a different grade or brand."
          : "Check back soon — we add new stock regularly."}
      </p>
    </div>
  );
}
