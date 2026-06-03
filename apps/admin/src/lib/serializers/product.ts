import type { Types } from "mongoose";
import type { StoredImage, SeoMeta } from "@store/shared";
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
} from "@/types/models";
import {
  asArray,
  asNumber,
  asString,
  calculateProductSeoScore,
  coerceStoredImage,
  objectIdString,
  resolveWarrantyDays,
  toIsoDate,
} from "@store/shared";

export type ProductLean = WithTimestamps<ProductAttributes> & {
  _id: Types.ObjectId;
};

/** Coerce a stored-image array off a lean document, dropping anything that
 *  doesn't survive `coerceStoredImage`. */
function asStoredImageArray(raw: unknown): StoredImage[] {
  return asArray<unknown>(raw)
    .map(coerceStoredImage)
    .filter((image): image is StoredImage => image !== null);
}

function toVariantResponse(variant: VariantAttributes): AdminVariant {
  return {
    id: objectIdString(variant._id),
    gradeSlug: asString(variant.gradeSlug),
    priceRupees: asNumber(variant.priceRupees),
    quantity: variant.quantity ?? 0,
    warrantyDays: resolveWarrantyDays(variant),
    warrantyMonths: variant.warrantyMonths,
    attributes: variant.attributes ?? {},
    attributeDisplay: variant.attributeDisplay,
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
    slug: brand?.slug ?? asString(product.brandSlug),
    name: brand?.name ?? asString(product.brandSlug),
  };
}

export function brandLookupKey(categorySlug: string, brandSlug: string): string {
  return `${categorySlug}:${brandSlug}`;
}

/** Variant-derived rollups (count, in-stock count, starting price, hero). */
function computeVariantRollup(product: ProductLean, images: StoredImage[]) {
  const variants = asArray<VariantAttributes>(product.variants);
  const variantCount = variants.length;
  const inStockCount = variants.filter((variant) => (variant?.quantity ?? 0) > 0).length;
  const prices = variants
    .map((variant) => asNumber(variant?.priceRupees))
    .filter((price) => price > 0);
  const minPriceRupees = prices.length > 0 ? Math.min(...prices) : undefined;
  const maxPriceRupees = prices.length > 0 ? Math.max(...prices) : undefined;
  const totalStockQuantity = variants.reduce((acc, variant) => acc + (variant?.quantity ?? 0), 0);
  const heroImage = images[0] ?? null;
  return { variantCount, inStockCount, minPriceRupees, maxPriceRupees, totalStockQuantity, heroImage };
}

/**
 * Distinct grade slugs across a product's variants. Used by the admin
 * grade filter dropdown so it can match products without fetching the
 * underlying variant documents.
 */
function computeVariantGradeSlugs(product: ProductLean): string[] {
  const variants = asArray<VariantAttributes>(product.variants);
  const gradeSet = new Set<string>();
  for (const variant of variants) {
    const grade = asString(variant?.gradeSlug);
    if (grade) gradeSet.add(grade);
  }
  return Array.from(gradeSet).sort();
}

export function summariseProduct(
  product: ProductLean,
  brandsByCategoryAndSlug: Map<string, BrandLean>,
  storeName: string
): AdminProductSummary {
  const categorySlug = asString(product.categorySlug);
  const brand = brandsByCategoryAndSlug.get(
    brandLookupKey(categorySlug, asString(product.brandSlug)),
  );
  const images = asStoredImageArray(product.images);
  const rollup = computeVariantRollup(product, images);
  const gradeSlugs = computeVariantGradeSlugs(product);

  const seoScore = product.seo?.score ?? calculateProductSeoScore(
    asString(product.name),
    brand?.name || "",
    product.seo,
    rollup.heroImage !== null,
    storeName
  );

  return {
    id: objectIdString(product._id),
    slug: asString(product.slug),
    name: asString(product.name),
    categorySlug,
    brand: toBrandRef(product, brand),
    isFeatured: product.isFeatured ?? false,
    isActive: product.isActive ?? true,
    isArchived: product.isArchived ?? false,
    ...rollup,
    gradeSlugs,
    hasImages: images.length > 0,
    seo: product.seo,
    seoScore,
    createdAt: toIsoDate(product.createdAt),
    updatedAt: toIsoDate(product.updatedAt),
  };
}

export function toProductResponse(
  product: ProductLean,
  brand: BrandLean | undefined,
): AdminProduct {
  const images = asStoredImageArray(product.images);
  const rollup = computeVariantRollup(product, images);
  const gradeSlugs = computeVariantGradeSlugs(product);

  return {
    id: objectIdString(product._id),
    slug: asString(product.slug),
    name: asString(product.name),
    categorySlug: asString(product.categorySlug),
    brand: toBrandRef(product, brand),
    isFeatured: product.isFeatured ?? false,
    isActive: product.isActive ?? true,
    isArchived: product.isArchived ?? false,
    ...rollup,
    gradeSlugs,
    hasImages: images.length > 0,
    images,
    variants: asArray<VariantAttributes>(product.variants).map(toVariantResponse),
    seo: product.seo,
    createdAt: toIsoDate(product.createdAt),
    updatedAt: toIsoDate(product.updatedAt),
  };
}
