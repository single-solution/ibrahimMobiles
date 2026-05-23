import type { Product } from "@store/shared";

/** One storefront card per variant, preserving the parent product metadata. */
export function expandProductsByVariant(products: Product[]): Product[] {
  const expanded: Product[] = [];
  for (const product of products) {
    for (const variant of product.variants) {
      expanded.push({
        ...product,
        variants: [variant],
      });
    }
  }
  return expanded;
}
