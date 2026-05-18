/**
 * DB → public storefront shape converters.
 *
 * The admin side works with Mongoose documents (`AdminProduct`, `AdminBrand`,
 * …); the storefront works with the public catalog types (`Phone`,
 * `Accessory`, `Brand`, `Offer`, …) declared in `@store/shared`. This file is
 * the bridge — every component imports those public types, and every query
 * helper in this folder returns those same shapes.
 *
 * Important security/UX rules baked in here:
 *   - We strip admin-only fields (isArchived, isActive, internal flags) from
 *     the storefront output.
 *   - We never emit a product/variant the customer shouldn't see (hidden by
 *     the query layer using `isActive: true, isArchived: { $ne: true }`).
 *   - IDs are stringified Mongo ObjectIds; slugs are the public key used in
 *     URLs.
 */

import type { Types } from "mongoose";

import type {
  BrandAttributes,
  OfferAttributes,
  ProductAttributes,
  VariantAttributes,
} from "@store/db";
import type {
  Accessory,
  AccessoryVariant,
  Brand as StorefrontBrand,
  Gadget,
  GadgetVariant,
  Offer as StorefrontOffer,
  Phone,
  PhoneVariant,
  Product as StorefrontProduct,
} from "@store/shared";

/** Mongoose lean shape for a brand. */
export type BrandLean = BrandAttributes & { _id: Types.ObjectId };
/** Mongoose lean shape for a product. */
export type ProductLean = ProductAttributes & { _id: Types.ObjectId };
/** Mongoose lean shape for an offer. */
export type OfferLean = OfferAttributes & { _id: Types.ObjectId };

/**
 * Default phone storage when an admin creates a phone variant without
 * explicitly setting `storageGb`. 128 is the most common modern entry-level
 * tier and matches the union member in `PhoneVariant["storageGb"]`.
 */
const DEFAULT_PHONE_STORAGE_GB: PhoneVariant["storageGb"] = 128;

/**
 * Brand → public Brand. `phoneCount` is supplied by the caller (computed via a
 * single aggregation across the catalogue rather than per-brand round trips).
 */
export function toStorefrontBrand(
  brand: BrandLean,
  productCount: number,
): StorefrontBrand {
  return {
    slug: brand.slug,
    name: brand.name,
    tagline: brand.tagline,
    phoneCount: productCount,
  };
}

function toPhoneVariant(variant: VariantAttributes): PhoneVariant {
  return {
    id: variant._id?.toString() ?? "",
    grade: variant.grade,
    colorName: variant.colorName,
    priceRupees: variant.priceRupees,
    originalPriceRupees: variant.originalPriceRupees,
    isInStock: variant.isInStock,
    warrantyMonths: variant.warrantyMonths,
    notes: variant.notes,
    storageGb: (variant.storageGb ?? DEFAULT_PHONE_STORAGE_GB) as PhoneVariant["storageGb"],
    ramGb: variant.ramGb ?? 0,
    batteryHealthRange: {
      minPercent: variant.batteryHealthMinPercent ?? 0,
      maxPercent: variant.batteryHealthMaxPercent ?? 100,
    },
    isPtaApproved: variant.isPtaApproved ?? false,
  };
}

function toAccessoryVariant(variant: VariantAttributes): AccessoryVariant {
  return {
    id: variant._id?.toString() ?? "",
    grade: variant.grade,
    colorName: variant.colorName,
    priceRupees: variant.priceRupees,
    originalPriceRupees: variant.originalPriceRupees,
    isInStock: variant.isInStock,
    warrantyMonths: variant.warrantyMonths,
    notes: variant.notes,
    connector: variant.connector,
    wattage: variant.wattage,
    lengthMeters: variant.lengthMeters,
    isGenuine: variant.isGenuine,
  };
}

function toGadgetVariant(variant: VariantAttributes): GadgetVariant {
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
  };
}

/**
 * Product → public {Phone, Accessory, Gadget}. Caller supplies the
 * brand-id → brand-slug map so we don't issue an N+1.
 */
export function toStorefrontProduct(
  product: ProductLean,
  brandsById: Map<string, { slug: string; name: string }>,
): StorefrontProduct | null {
  const brand = brandsById.get(product.brandId.toString());
  if (!brand) {
    return null;
  }

  const base = {
    id: product._id.toString(),
    slug: product.slug,
    brandSlug: brand.slug,
    brandName: brand.name,
    modelName: product.modelName,
    imageUrl: product.imageUrl,
    galleryUrls: product.galleryUrls ?? [],
    releaseYear: product.releaseYear,
    highlights: product.highlights ?? [],
    isFeatured: product.isFeatured,
  };

  if (product.category === "phone") {
    const phone: Phone = {
      ...base,
      category: "phone",
      variants: (product.variants ?? []).map(toPhoneVariant),
    };
    return phone;
  }
  if (product.category === "accessory") {
    const accessory: Accessory = {
      ...base,
      category: "accessory",
      accessoryType: product.accessoryType ?? "other",
      variants: (product.variants ?? []).map(toAccessoryVariant),
    };
    return accessory;
  }
  const gadget: Gadget = {
    ...base,
    category: "gadget",
    gadgetType: product.gadgetType ?? "gadget",
    variants: (product.variants ?? []).map(toGadgetVariant),
  };
  return gadget;
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
    accentColor: offer.accentColor,
    badgeLabel: offer.badgeLabel,
  };
}
