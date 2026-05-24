"use client";

import type { Product } from "@store/shared";

import { expandProductsByGrade } from "@/lib/catalog/expandProductGrades";
import {
  FILTER_PARAM_KEYS,
  hasActiveListingFilters,
  isExpandGradesView,
} from "@/lib/storefront/filterParams";
import { useFilterParams } from "@/lib/storefront/useFilterParams";
import { resolveListingVariant } from "@/lib/productSummary";

import { ProductCard } from "./ProductCard";
import { useSwapAnimation } from "@/components/motion/useSwapAnimation";

interface ShopProductGridProps {
  products: Product[];
  categoryLabel: string;
}

export function ShopProductGrid({ products, categoryLabel }: ShopProductGridProps) {
  const { params } = useFilterParams();
  const expandGrades = isExpandGradesView(params);
  const cards = expandGrades ? expandProductsByGrade(products) : products;
  const gradeSlugs = (params.get(FILTER_PARAM_KEYS.grades) ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  const filtersActive = hasActiveListingFilters(params);
  const listingKey = params.toString();
  const isListingSwap = useSwapAnimation(listingKey);

  if (cards.length === 0) {
    return (
      <ShopListingEmptyState
        categoryLabel={categoryLabel}
        filtersActive={filtersActive}
        isListingSwap={isListingSwap}
      />
    );
  }

  return (
    <div
      className={`reveal-stagger grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4 xl:gap-7${isListingSwap ? " listing-swap" : ""}`}
    >
      {cards.map((product) => {
        const catalogProduct = products.find((row) => row.id === product.id) ?? product;
        const listingVariant = resolveListingVariant(product, { gradeSlugs });
        const pinnedGradeSlug = expandGrades ? listingVariant.gradeSlug : undefined;
        return (
          <div
            key={`${product.id}:${pinnedGradeSlug ?? "product"}`}
            className="reveal h-full"
          >
            <ProductCard
              product={product}
              catalogProduct={catalogProduct}
              pinnedGradeSlug={pinnedGradeSlug}
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
  isListingSwap,
}: {
  categoryLabel: string;
  filtersActive: boolean;
  isListingSwap: boolean;
}) {
  return (
    <div
      role="status"
      className={`reveal rounded-[var(--radius-lg)] border border-dashed border-[var(--color-accent-200)]/60 bg-gradient-to-b from-[var(--color-accent-50)]/40 to-[var(--color-canvas-deep)]/30 px-6 py-14 text-center${isListingSwap ? " listing-swap" : ""}`}
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
