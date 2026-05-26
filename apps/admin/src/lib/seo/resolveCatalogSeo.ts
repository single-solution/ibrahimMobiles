import {
  composeBrandSeo,
  composeCategorySeo,
  composeOfferSeo,
  composeProductSeo,
  evaluateSeoChecklist,
  type Brand,
  type CatalogSeoChecklistContext,
  type CatalogSeoKind,
  type Offer,
  type Product,
  type ResolvedSeoMeta,
  type SeoChecklistResult,
  type SeoMeta,
  type SeoSettings,
  type StoredImage,
  type StorefrontVariant,
} from "@store/shared";

export interface ProductSeoInput {
  slug: string;
  name: string;
  brandName: string;
  categorySlug: string;
  brand?: { slug: string; name: string };
  category?: { slug: string; label: string; description?: string };
  variants: Array<{ images: StoredImage[] }>;
}

export interface CategorySeoInput {
  slug: string;
  label: string;
  description?: string;
}

export interface BrandSeoInput {
  slug: string;
  name: string;
}

export interface OfferSeoInput {
  slug: string;
  title: string;
  description: string;
  bannerImage?: StoredImage | null;
}

export type CatalogSeoInput =
  | { type: "product"; entity: ProductSeoInput }
  | { type: "category"; entity: CategorySeoInput }
  | { type: "brand"; entity: BrandSeoInput }
  | { type: "offer"; entity: OfferSeoInput };

function toPreviewProduct(input: ProductSeoInput): Product {
  const variant: StorefrontVariant = {
    id: "preview",
    gradeSlug: "preview",
    priceRupees: 0,
    quantity: 1,
    images: input.variants[0]?.images ?? [],
    attributes: {},
  };
  return {
    id: "preview",
    slug: input.slug,
    name: input.name,
    brandName: input.brandName,
    brandSlug: input.brand?.slug ?? "",
    categorySlug: input.categorySlug,
    isFeatured: false,
    variants: [variant, ...input.variants.slice(1).map((v, i) => ({
      ...variant,
      id: `preview-${i}`,
      images: v.images,
    }))],
  };
}

export function resolveCatalogSeo(
  input: CatalogSeoInput,
  seo: SeoMeta,
  settings: SeoSettings,
): { resolved: ResolvedSeoMeta; checklist: SeoChecklistResult } {
  let resolved: ResolvedSeoMeta;
  let context: CatalogSeoChecklistContext;

  switch (input.type) {
    case "product": {
      const product = toPreviewProduct(input.entity);
      const variant = product.variants[0];
      resolved = composeProductSeo({
        product,
        variant,
        brand: input.entity.brand ?? null,
        category: input.entity.category ?? null,
        settings,
        seo,
      });
      const allAltsOk =
        product.variants.length > 0 &&
        product.variants.every((v) =>
          v.images.length > 0
            ? v.images.every((img) => img.alt.trim().length > 0)
            : true,
        );
      context = {
        slug: input.entity.slug,
        hasHeroImage: (variant?.images.length ?? 0) > 0,
        allVariantImagesHaveAlt: allAltsOk,
      };
      break;
    }
    case "category": {
      resolved = composeCategorySeo({
        category: {
          slug: input.entity.slug,
          label: input.entity.label,
          description: input.entity.description,
        },
        settings,
        seo,
      });
      context = {
        slug: input.entity.slug,
      };
      break;
    }
    case "brand": {
      const brand: Brand = {
        slug: input.entity.slug,
        name: input.entity.name,
        productCount: 0,
      };
      resolved = composeBrandSeo({ brand, settings, seo });
      context = { slug: input.entity.slug };
      break;
    }
    case "offer": {
      const offer: Offer = {
        id: "preview",
        slug: input.entity.slug,
        title: input.entity.title,
        description: input.entity.description,
        discountLabel: "",
        expiresAt: new Date().toISOString(),
        color: "#e1ff51",
        badgeLabel: "",
        bannerImage: input.entity.bannerImage ?? undefined,
      };
      resolved = composeOfferSeo({ offer, settings, seo });
      context = {
        slug: input.entity.slug,
        hasHeroImage: Boolean(input.entity.bannerImage),
      };
      break;
    }
  }

  const checklist = evaluateSeoChecklist(
    resolved,
    context,
    seo.focusKeyword,
    input.type as CatalogSeoKind,
  );

  return { resolved, checklist };
}
