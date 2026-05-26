/**
 * DB → public storefront shape converters.
 *
 * Every component in the web app imports the public catalog types
 * (`Brand`, `Product`, `StorefrontVariant`, `Offer`, `GradeDescriptor`)
 * from `@store/shared`. This file is the bridge — query helpers in this
 * folder return those shapes and only those shapes.
 *
 * Security/UX guarantees enforced here:
 *   - Admin-only flags (`isArchived`, `isActive`) are stripped — the
 *     query layer already filters them out, this file never re-emits.
 *   - IDs are stringified Mongo ObjectIds; slugs are the public URL key.
 *   - The output is JSON-safe (no Date / ObjectId in the response).
 */

import type { Types } from "mongoose";

import type {
  AttributeAttributes,
  BrandAttributes,
  GradeAttributes,
  OfferAttributes,
  ProductAttributes,
  VariantAttributes,
  WithTimestamps,
} from "@store/db";
import type {
  AttributeDescriptor,
  Brand as StorefrontBrand,
  GradeDescriptor,
  Offer as StorefrontOffer,
  Product as StorefrontProduct,
  ProductGradeImagesEntry,
  StorefrontVariant,
  StoredImage,
} from "@store/shared";
import { resolveWarrantyDays } from "@store/shared";
import {
  asArray,
  asNumber,
  asString,
  coerceStoredImage,
  deriveGradeImagesFromVariants,
  hasStructuredContent,
  imagesForProductGrade,
  isStoredImage,
  normalizeStructuredContent,
  objectIdString,
  sortAttributeOptions,
  toIsoDate,
} from "@store/shared";

/** Mongoose lean shape for a brand. */
export type BrandLean = WithTimestamps<BrandAttributes> & {
  _id: Types.ObjectId;
};
/** Mongoose lean shape for a product. */
export type ProductLean = WithTimestamps<ProductAttributes> & {
  _id: Types.ObjectId;
};
/** Mongoose lean shape for an offer. */
export type OfferLean = WithTimestamps<OfferAttributes> & {
  _id: Types.ObjectId;
};
/** Mongoose lean shape for a grade. */
export type GradeLean = WithTimestamps<GradeAttributes> & {
  _id: Types.ObjectId;
};
export type AttributeLean = WithTimestamps<AttributeAttributes> & {
  _id: Types.ObjectId;
};

/**
 * Brand → public Brand. `productCount` is supplied by the caller (we
 * compute it via a single aggregation per page render, not per-brand).
 */
export function toStorefrontBrand(
  brand: BrandLean,
  productCount: number,
): StorefrontBrand {
  return {
    slug: asString(brand.slug),
    name: asString(brand.name),
    productCount: asNumber(productCount),
    seo: brand.seo,
  };
}

export function toStorefrontAttribute(
  attribute: AttributeLean,
): AttributeDescriptor {
  return {
    categorySlug: asString(attribute.categorySlug),
    slug: asString(attribute.slug),
    label: asString(attribute.label),
    unit: asString(attribute.unit) || undefined,
    options: sortAttributeOptions(
      asArray<AttributeAttributes["options"][number]>(attribute.options).map(
        (option) => ({
          value: asString(option?.value),
          label: asString(option?.label),
          backgroundColor: option?.backgroundColor,
        }),
      ),
      asString(attribute.unit) || undefined,
    ),
    visibility: attribute.visibility
      ? {
          type: attribute.visibility.type,
          ...(attribute.visibility.brandSlugs
            ? { brandSlugs: attribute.visibility.brandSlugs }
            : {}),
          ...(attribute.visibility.gradeSlugs
            ? { gradeSlugs: attribute.visibility.gradeSlugs }
            : {}),
          ...(attribute.visibility.attributeSlug
            ? { attributeSlug: attribute.visibility.attributeSlug }
            : {}),
          ...(attribute.visibility.optionValues
            ? { optionValues: attribute.visibility.optionValues }
            : {}),
        }
      : undefined,
    cardPosition: attribute.cardPosition ?? "title-chips",
  };
}

function legacyVariantImagesFromLean(product: ProductLean) {
  return asArray<VariantAttributes>(product.variants).map((variant) => {
    const raw = variant as VariantAttributes & { images?: unknown };
    return {
      gradeSlug: asString(variant.gradeSlug),
      images: asArray<unknown>(raw.images)
        .map(coerceStoredImage)
        .filter((image): image is StoredImage => image !== null),
    };
  });
}

function toStorefrontVariant(
  variant: VariantAttributes,
  gradeImages: ProductGradeImagesEntry[],
  legacyVariants: ReturnType<typeof legacyVariantImagesFromLean>,
): StorefrontVariant {
  const gradeSlug = asString(variant.gradeSlug);
  return {
    id: objectIdString(variant._id),
    gradeSlug,
    priceRupees: asNumber(variant.priceRupees),
    quantity: variant.quantity ?? 0,
    warrantyDays: resolveWarrantyDays(variant),
    images: imagesForProductGrade(gradeSlug, gradeImages, legacyVariants),
    attributes: variant.attributes ?? {},
    attributeDisplay: variant.attributeDisplay,
  };
}

/**
 * Product → public Product. Caller supplies the category+brand → brand-name
 * map so we don't issue an N+1 against the Brand collection.
 *
 * Returns `null` when the brand reference is broken — the storefront
 * silently drops such rows rather than ship a card with an empty brand
 * line. Admin tooling surfaces these dangling rows separately.
 */
export function toStorefrontProduct(
  product: ProductLean,
  brandsByCategoryAndSlug: Map<string, { slug: string; name: string }>,
): StorefrontProduct | null {
  const categorySlug = asString(product.categorySlug);
  const brand = brandsByCategoryAndSlug.get(
    `${categorySlug}:${asString(product.brandSlug)}`,
  );
  if (!brand) {
    return null;
  }

  const persistedGradeImages = asArray<
    NonNullable<ProductAttributes["gradeImages"]>[number]
  >(product.gradeImages)
    .map((entry) => ({
      gradeSlug: asString(entry?.gradeSlug),
      images: asArray<unknown>(entry?.images)
        .map(coerceStoredImage)
        .filter((image): image is StoredImage => image !== null),
    }))
    .filter((entry) => entry.gradeSlug.length > 0 && entry.images.length > 0);

  const legacyVariants = legacyVariantImagesFromLean(product);
  const gradeImages =
    persistedGradeImages.length > 0
      ? persistedGradeImages
      : deriveGradeImagesFromVariants(legacyVariants);

  return {
    id: objectIdString(product._id),
    slug: asString(product.slug),
    name: asString(product.name),
    brandSlug: brand.slug,
    brandName: brand.name,
    categorySlug,
    isFeatured: product.isFeatured ?? false,
    gradeImages,
    variants: asArray<VariantAttributes>(product.variants).map((variant) =>
      toStorefrontVariant(variant, gradeImages, legacyVariants),
    ),
    seo: product.seo,
  };
}

export function toStorefrontOffer(offer: OfferLean): StorefrontOffer {
  const description = asString(offer.description);
  const content = normalizeStructuredContent(offer.content, description);
  return {
    id: objectIdString(offer._id),
    slug: asString(offer.slug),
    title: asString(offer.title),
    description,
    discountLabel: asString(offer.discountLabel),
    expiresAt: offer.expiresAt
      ? toIsoDate(offer.expiresAt)
      : toIsoDate(new Date()),
    color: asString(offer.color, "#e1ff51"),
    badgeLabel: asString(offer.badgeLabel),
    bannerImage: isStoredImage(offer.bannerImage) ? offer.bannerImage : undefined,
    content: hasStructuredContent(content) ? content : undefined,
    seo: offer.seo,
  };
}

export function toStorefrontGrade(grade: GradeLean): GradeDescriptor {
  const notes = asString(grade.notes);
  const content = normalizeStructuredContent(grade.content, notes);
  return {
    categorySlug: asString(grade.categorySlug),
    slug: asString(grade.slug),
    label: asString(grade.label),
    notes,
    color: asString(grade.color),
    video: grade.video || undefined,
    content: hasStructuredContent(content) ? content : undefined,
  };
}
