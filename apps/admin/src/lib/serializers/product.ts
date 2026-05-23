import type { Types } from "mongoose";
import {
  deriveGradeImagesFromVariants,
  imagesForProductGrade,
  type ProductGradeImagesEntry,
} from "@store/shared";
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
import {
  asArray,
  asNumber,
  asString,
  coerceStoredImage,
  objectIdString,
  resolveWarrantyDays,
  toIsoDate,
} from "@store/shared";

export type ProductLean = WithTimestamps<ProductAttributes> & {
  _id: Types.ObjectId;
};

function legacyVariantImagesFromLean(product: ProductLean) {
  return asArray<VariantAttributes>(product.variants).map((variant) => {
    const raw = variant as VariantAttributes & { images?: unknown };
    return {
      gradeSlug: asString(variant.gradeSlug),
      images: asArray<unknown>(raw.images)
        .map(coerceStoredImage)
        .filter((image): image is NonNullable<typeof image> => image !== null),
    };
  });
}

/** `product.gradeImages` in Mongo; unmigrated docs may still have photos on variants. */
function resolveGradeImages(product: ProductLean): ProductGradeImagesEntry[] {
  const persisted = asArray<NonNullable<ProductAttributes["gradeImages"]>[number]>(
    product.gradeImages,
  )
    .map((entry) => ({
      gradeSlug: asString(entry?.gradeSlug),
      images: asArray<unknown>(entry?.images)
        .map(coerceStoredImage)
        .filter((image): image is NonNullable<typeof image> => image !== null),
    }))
    .filter((entry) => entry.gradeSlug.length > 0 && entry.images.length > 0);

  if (persisted.length > 0) {
    return persisted;
  }

  return deriveGradeImagesFromVariants(legacyVariantImagesFromLean(product));
}

function toVariantResponse(
  variant: VariantAttributes,
  gradeImages: ProductGradeImagesEntry[],
  legacyVariants: ReturnType<typeof legacyVariantImagesFromLean>,
): AdminVariant {
  const gradeSlug = asString(variant.gradeSlug);
  return {
    id: objectIdString(variant._id),
    gradeSlug,
    priceRupees: asNumber(variant.priceRupees),
    quantity: variant.quantity ?? 0,
    warrantyDays: resolveWarrantyDays(variant),
    warrantyMonths: variant.warrantyMonths,
    attributes: variant.attributes ?? {},
    attributeDisplay: variant.attributeDisplay,
    images: imagesForProductGrade(gradeSlug, gradeImages, legacyVariants),
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
function computeVariantRollup(product: ProductLean) {
  const variants = asArray<VariantAttributes>(product.variants);
  const gradeImages = resolveGradeImages(product);
  const legacyVariants = legacyVariantImagesFromLean(product);
  const variantCount = variants.length;
  const inStockCount = variants.filter((variant) => (variant?.quantity ?? 0) > 0).length;
  const prices = variants
    .map((variant) => asNumber(variant?.priceRupees))
    .filter((price) => price > 0);
  const minPriceRupees = prices.length > 0 ? Math.min(...prices) : undefined;
  const firstVariant = variants[0];
  const heroImage =
    (firstVariant
      ? imagesForProductGrade(
          asString(firstVariant.gradeSlug),
          gradeImages,
          legacyVariants,
        )[0]
      : null) ??
    gradeImages[0]?.images[0] ??
    null;
  return { variantCount, inStockCount, minPriceRupees, heroImage };
}

export function summariseProduct(
  product: ProductLean,
  brandsByCategoryAndSlug: Map<string, BrandLean>,
): AdminProductSummary {
  const categorySlug = asString(product.categorySlug);
  const brand = brandsByCategoryAndSlug.get(
    brandLookupKey(categorySlug, asString(product.brandSlug)),
  );
  const rollup = computeVariantRollup(product);

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
    createdAt: toIsoDate(product.createdAt),
    updatedAt: toIsoDate(product.updatedAt),
  };
}

export function toProductResponse(
  product: ProductLean,
  brand: BrandLean | undefined,
): AdminProduct {
  const rollup = computeVariantRollup(product);
  const gradeImages = resolveGradeImages(product);
  const legacyVariants = legacyVariantImagesFromLean(product);

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
    gradeImages,
    variants: asArray<VariantAttributes>(product.variants).map((variant) =>
      toVariantResponse(variant, gradeImages, legacyVariants),
    ),
    seo: product.seo,
    createdAt: toIsoDate(product.createdAt),
    updatedAt: toIsoDate(product.updatedAt),
  };
}
