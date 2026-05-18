import type { Types } from "mongoose";
import type { ProductAttributes, VariantAttributes } from "@store/db";
import type { BrandLean } from "@/lib/serializers/brand";
import type { AdminProduct, AdminProductSummary, AdminVariant } from "@/types/admin";

export type ProductLean = ProductAttributes & { _id: Types.ObjectId };

function toVariantResponse(variant: VariantAttributes): AdminVariant {
  return {
    id: variant._id?.toString() ?? "",
    grade: variant.grade,
    colorName: variant.colorName,
    priceRupees: variant.priceRupees,
    originalPriceRupees: variant.originalPriceRupees,
    isInStock: variant.isInStock,
    warrantyMonths: variant.warrantyMonths,
    notes: variant.notes,
    storageGb: variant.storageGb,
    ramGb: variant.ramGb,
    batteryHealthMinPercent: variant.batteryHealthMinPercent,
    batteryHealthMaxPercent: variant.batteryHealthMaxPercent,
    isPtaApproved: variant.isPtaApproved,
    connector: variant.connector,
    wattage: variant.wattage,
    lengthMeters: variant.lengthMeters,
    isGenuine: variant.isGenuine,
  };
}

/** Convert the embedded brand reference into the public shape both responses use. */
function toBrandRef(product: ProductLean, brand: BrandLean | undefined) {
  return {
    id: brand ? brand._id.toString() : product.brandId.toString(),
    slug: brand?.slug ?? "",
    name: brand?.name ?? "",
  };
}

/** Variant-derived rollups (count, in-stock count, starting price) shared by every response. */
function computeVariantRollup(product: ProductLean) {
  const variantCount = product.variants.length;
  const inStockCount = product.variants.filter((variant) => variant.isInStock).length;
  const prices = product.variants
    .map((variant) => variant.priceRupees)
    .filter((price) => price > 0);
  const minPriceRupees = prices.length > 0 ? Math.min(...prices) : undefined;
  return { variantCount, inStockCount, minPriceRupees };
}

export function summariseProduct(
  product: ProductLean,
  brandsById: Map<string, BrandLean>,
): AdminProductSummary {
  const brand = brandsById.get(product.brandId.toString());
  const rollup = computeVariantRollup(product);

  return {
    id: product._id.toString(),
    slug: product.slug,
    modelName: product.modelName,
    category: product.category,
    accessoryType: product.accessoryType,
    gadgetType: product.gadgetType,
    brand: toBrandRef(product, brand),
    imageUrl: product.imageUrl,
    releaseYear: product.releaseYear,
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
    modelName: product.modelName,
    category: product.category,
    accessoryType: product.accessoryType,
    gadgetType: product.gadgetType,
    brand: toBrandRef(product, brand),
    imageUrl: product.imageUrl,
    galleryUrls: product.galleryUrls ?? [],
    releaseYear: product.releaseYear,
    highlights: product.highlights ?? [],
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    isArchived: product.isArchived,
    ...rollup,
    variants: product.variants.map(toVariantResponse),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
