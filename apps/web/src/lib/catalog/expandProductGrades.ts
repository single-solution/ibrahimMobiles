import type { Product } from "@store/shared";

/**
 * One storefront card per distinct grade on a product. Each row keeps only
 * variants for that grade so listing helpers resolve price/image in-grade.
 */
export function expandProductsByGrade(products: Product[]): Product[] {
  const expanded: Product[] = [];
  for (const product of products) {
    const gradeSlugs = [
      ...new Set(
        product.variants
          .map((variant) => variant.gradeSlug)
          .filter((slug) => slug.length > 0),
      ),
    ];
    for (const gradeSlug of gradeSlugs) {
      const variantsInGrade = product.variants.filter(
        (variant) => variant.gradeSlug === gradeSlug,
      );
      if (variantsInGrade.length === 0) {
        continue;
      }
      expanded.push({
        ...product,
        variants: variantsInGrade,
      });
    }
  }
  return expanded;
}
