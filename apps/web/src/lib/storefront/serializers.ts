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
  BrandAttributes,
  GradeAttributes,
  OfferAttributes,
  ProductAttributes,
  VariantAttributes,
  WithTimestamps,
} from "@store/db";
import type {
  Brand as StorefrontBrand,
  GradeDescriptor,
  Offer as StorefrontOffer,
  Product as StorefrontProduct,
  StorefrontVariant,
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

/**
 * Brand → public Brand. `productCount` is supplied by the caller (we
 * compute it via a single aggregation per page render, not per-brand).
 */
export function toStorefrontBrand(
  brand: BrandLean,
  productCount: number,
): StorefrontBrand {
  return {
    slug: brand.slug,
    name: brand.name,
    productCount,
  };
}

function toStorefrontVariant(variant: VariantAttributes): StorefrontVariant {
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
 * Product → public Product. Caller supplies the brand-slug → brand-name
 * map so we don't issue an N+1 against the Brand collection.
 *
 * Returns `null` when the brand reference is broken — the storefront
 * silently drops such rows rather than ship a card with an empty brand
 * line. Admin tooling surfaces these dangling rows separately.
 */
export function toStorefrontProduct(
  product: ProductLean,
  brandsBySlug: Map<string, { slug: string; name: string }>,
): StorefrontProduct | null {
  const brand = brandsBySlug.get(product.brandSlug);
  if (!brand) {
    return null;
  }

  return {
    id: product._id.toString(),
    slug: product.slug,
    name: product.name,
    brandSlug: brand.slug,
    brandName: brand.name,
    categorySlug: product.categorySlug,
    isFeatured: product.isFeatured,
    variants: (product.variants ?? []).map(toStorefrontVariant),
  };
}

export function toStorefrontOffer(offer: OfferLean): StorefrontOffer {
  return {
    id: offer._id.toString(),
    slug: offer.slug,
    title: offer.title,
    description: offer.description,
    discountLabel: offer.discountLabel,
    expiresAt: offer.expiresAt
      ? offer.expiresAt.toISOString()
      : new Date().toISOString(),
    color: offer.color,
    badgeLabel: offer.badgeLabel,
    bannerImage: offer.bannerImage,
  };
}

export function toStorefrontGrade(grade: GradeLean): GradeDescriptor {
  return {
    categorySlug: grade.categorySlug,
    slug: grade.slug,
    label: grade.label,
    notes: grade.notes,
    color: grade.color,
    video: grade.video || undefined,
  };
}
