import type { AdminProductSummary } from "@/types/models";

/** How variant quantities roll up for a product shell. */
export type VariantStockRollup =
  | "no_variants"
  | "all_out_of_stock"
  | "partial_stock"
  | "fully_stocked";

export type ProductListFilter =
  | "all"
  | "no_variants"
  | "partial_stock"
  | "all_out_of_stock"
  | "fully_stocked"
  | "featured"
  | "hidden";

export function variantStockRollup(product: AdminProductSummary): VariantStockRollup {
  if (product.variantCount === 0) return "no_variants";
  if (product.inStockCount === 0) return "all_out_of_stock";
  if (product.inStockCount === product.variantCount) return "fully_stocked";
  return "partial_stock";
}

export function matchesProductListFilter(
  product: AdminProductSummary,
  filter: ProductListFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "featured") return product.isFeatured;
  if (filter === "hidden") return !product.isActive;
  return variantStockRollup(product) === filter;
}

export function countByProductListFilter(
  products: AdminProductSummary[],
  filter: ProductListFilter,
): number {
  return products.filter((product) => matchesProductListFilter(product, filter)).length;
}

export interface VariantStockStatusPill {
  label: string;
  tone: "success" | "danger" | "warn" | "neutral";
}

/** Storefront/catalog pills derived from per-variant quantity rollups. */
export function variantStockStatusPills(
  product: AdminProductSummary,
): VariantStockStatusPill[] {
  switch (variantStockRollup(product)) {
    case "no_variants":
      return [{ label: "No variants", tone: "warn" }];
    case "all_out_of_stock":
      return [{ label: "All variants OOS", tone: "danger" }];
    case "partial_stock":
      return [
        {
          label: `${product.inStockCount}/${product.variantCount} variants in stock`,
          tone: "warn",
        },
      ];
    case "fully_stocked":
      return [
        {
          label: `${product.variantCount} variants in stock`,
          tone: "success",
        },
      ];
  }
}

export function formatVariantStockSummary(product: AdminProductSummary): string {
  if (product.variantCount === 0) return "No variants";
  return `${product.inStockCount}/${product.variantCount} with stock`;
}
