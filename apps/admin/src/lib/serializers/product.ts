import type { Types } from "mongoose";
import type {
  ProductAttributes,
  VariantAttributes,
  WithTimestamps,
} from "@store/db";
import type { BrandLean } from "@/lib/serializers/brand";
import type {
  AdminProduct,
  AdminProductSummary,
  AdminVariant,
} from "@/types/admin";

export type ProductLean = WithTimestamps<ProductAttributes> & {
  _id: Types.ObjectId;
};

function toVariantResponse(variant: VariantAttributes): AdminVariant {
  return {
    id: variant._id?.toString() ?? "",
    gradeSlug: variant.gradeSlug,
    priceRupees: variant.priceRupees,
    quantity: variant.quantity ?? 0,
    warrantyMonths: variant.warrantyMonths,
    images: variant.images ?? [],
    attributes: variant.attributes ?? {},
  };
}

/**
 * Resolve the embedded brand reference. The new product shape carries
 * `brandSlug: string`; an optional `BrandLean` lookup is used to fill in
 * `name`. If the brand has been deleted, `name` falls back to the slug
 * so the admin grid still renders a readable label.
 */
function toBrandRef(product: ProductLean, brand: BrandLean | undefined) {
  return {
    slug: brand?.slug ?? product.brandSlug,
    name: brand?.name ?? product.brandSlug,
  };
}

/** Variant-derived rollups (count, in-stock count, starting price, hero). */
function computeVariantRollup(product: ProductLean) {
  const variantCount = product.variants.length;
  const inStockCount = product.variants.filter((variant) => variant.quantity > 0).length;
  const prices = product.variants
    .map((variant) => variant.priceRupees)
    .filter((price) => price > 0);
  const minPriceRupees = prices.length > 0 ? Math.min(...prices) : undefined;
  const heroImage = product.variants[0]?.images?.[0] ?? null;
  return { variantCount, inStockCount, minPriceRupees, heroImage };
}

export function summariseProduct(
  product: ProductLean,
  brandsBySlug: Map<string, BrandLean>,
): AdminProductSummary {
  const brand = brandsBySlug.get(product.brandSlug);
  const rollup = computeVariantRollup(product);

  return {
    id: product._id.toString(),
    slug: product.slug,
    name: product.name,
    categorySlug: product.categorySlug,
    brand: toBrandRef(product, brand),
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    isArchived: product.isArchived,
    ...rollup,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toProductResponse(
  product: ProductLean,
  brand: BrandLean | undefined,
): AdminProduct {
  const rollup = computeVariantRollup(product);

  return {
    id: product._id.toString(),
    slug: product.slug,
    name: product.name,
    categorySlug: product.categorySlug,
    brand: toBrandRef(product, brand),
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    isArchived: product.isArchived,
    ...rollup,
    variants: product.variants.map(toVariantResponse),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
