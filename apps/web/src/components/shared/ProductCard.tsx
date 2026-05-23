"use client";

import Link from "next/link";
import { Layers } from "lucide-react";

import { formatPrice, resolveVariantAttributeLabel, type Product } from "@store/shared";
import { toAttributeLabelSource } from "@/lib/catalog/attributeLabels";

import { ColoredPill } from "@/components/shared/ColoredPill";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ProductImage } from "@/components/shared/ProductImage";
import { WishlistButton } from "@/components/shared/WishlistButton";
import { productHref } from "@/lib/catalog/productPaths";
import {
  getDefaultVariant,
  isProductInStock,
  resolveListingVariant,
  resolveVariantHeroImage,
} from "@/lib/productSummary";
import { useAttributesForCategory } from "@/lib/storefront/storefrontReferenceContext";

interface ProductCardProps {
  product: Product;
  /** When set, the card links to this variant on the PDP (shop grid passes this). */
  variantId?: string;
  /** Hide the multi-variant options chip (expanded variant listing). */
  hideVariantCount?: boolean;
}

/**
 * Compact storefront tile.
 *
 * Compact storefront tile backed by the admin-authored catalog. Attribute
 * chips come from the default variant and the active category metadata.
 */
export function ProductCard({
  product,
  variantId,
  hideVariantCount = false,
}: ProductCardProps) {
  const brandName = product.brandName ?? product.brandSlug;
  const displayVariant = variantId
    ? (product.variants.find((row) => row.id === variantId) ??
      resolveListingVariant(product))
    : resolveListingVariant(product);
  const defaultVariant = getDefaultVariant(product);
  const attributes = useAttributesForCategory(product.categorySlug);
  const href = productHref(product, {
    variant: displayVariant,
  });
  const inStock = isProductInStock(product);
  const heroImage =
    resolveVariantHeroImage(product, displayVariant) ??
    resolveVariantHeroImage(product, defaultVariant);
  const variantCount = product.variants.length;
  const isMultiVariant = variantCount > 1;
  const hasVariants = variantCount > 0;
  const titleChips = getAttributeChips(
    displayVariant,
    attributes,
    "title-chips",
  );
  const overlayChips = getAttributeChips(
    displayVariant,
    attributes,
    "image-overlay",
  );

  return (
    <Link href={href} className="group block focus:outline-none">
      <div className="lift flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:border-[var(--color-ink-200)]">
        <div className="relative aspect-square overflow-hidden bg-[var(--color-canvas-deep)]">
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <ProductImage
              image={heroImage}
              variant="card"
              name={product.name}
              brandName={brandName}
              brandSlug={product.brandSlug}
              objectFit="cover"
            />
          </div>

          {heroImage ? (
            <WishlistButton
              productId={product.id}
              productSlug={product.slug}
              name={product.name}
              brandSlug={product.brandSlug}
              brandName={brandName}
              image={heroImage}
              categorySlug={product.categorySlug}
              fromPriceRupees={displayVariant.priceRupees}
            />
          ) : null}

          <div className="absolute right-1.5 top-1.5 z-10 flex flex-col items-end gap-1 md:right-3 md:top-3 md:gap-1.5">
            <GradeBadge
              categorySlug={product.categorySlug}
              gradeSlug={displayVariant.gradeSlug}
              size="sm"
            />
          </div>

          {overlayChips.length > 0 && (
            <div className="absolute bottom-1.5 left-1.5 z-10 flex max-w-[calc(100%-12px)] flex-wrap gap-1 md:bottom-3 md:left-3">
              {overlayChips.map((chip) => (
                <AttributeChip key={chip.key} chip={chip} />
              ))}
            </div>
          )}

          {(!hasVariants || !inStock) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-ink-900)]/45 backdrop-blur-[1px]">
              <span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-900)] shadow-[var(--shadow-md)] md:px-4 md:py-1.5 md:text-[11px]">
                {hasVariants ? "Sold out" : "Unavailable"}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-1.5 p-2.5 md:p-3">
            <div className="space-y-1">
              <span className="line-clamp-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)] md:text-[11px]">
                {brandName}
              </span>
              <h3 className="line-clamp-1 text-[14px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] md:text-[16px]">
                {product.name}
              </h3>
              {titleChips.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {titleChips.slice(0, 3).map((chip) => (
                    <AttributeChip key={chip.key} chip={chip} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-2.5 py-2 md:px-3 md:py-2.5">
            <p className="text-[15px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)] md:text-[17px]">
              {hasVariants ? formatPrice(displayVariant.priceRupees) : "Unavailable"}
            </p>
            {isMultiVariant && !hideVariantCount && (
              <span className="inline-flex items-center gap-0.5 rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-ink-700)] md:gap-1 md:px-2 md:py-0.5 md:text-[11px]">
                <Layers size={9} className="md:size-[11px]" />
                {variantCount}
                <span className="hidden md:inline"> options</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

interface AttributeChipModel {
  key: string;
  label: string;
  backgroundColor?: string;
}

function getAttributeChips(
  variant: Product["variants"][number],
  attributes: ReturnType<typeof useAttributesForCategory>,
  cardPosition: "image-overlay" | "title-chips",
): AttributeChipModel[] {
  const values = variant.attributes;
  const display = variant.attributeDisplay ?? {};
  return attributes
    .filter((attribute) => attribute.cardPosition === cardPosition)
    .flatMap((attribute) => {
      const raw = values[attribute.slug];
      if (!raw) {
        return [];
      }
      const optionValues = Array.isArray(raw) ? raw : [raw];
      return optionValues.map((value) => ({
        key: `${attribute.slug}:${value}`,
        label: resolveVariantAttributeLabel(
          toAttributeLabelSource(attribute),
          value,
          display,
        ),
        backgroundColor: attribute.options.find((candidate) => candidate.value === value)
          ?.backgroundColor,
      }));
    });
}

function AttributeChip({ chip }: { chip: AttributeChipModel }) {
  const pillClass =
    "max-w-full truncate rounded-full border border-black/5 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur md:px-2 md:text-[11px]";

  if (chip.backgroundColor) {
    return (
      <ColoredPill
        backgroundColor={chip.backgroundColor}
        className={`${pillClass} border-transparent`}
      >
        {chip.label}
      </ColoredPill>
    );
  }

  return (
    <span
      className={`inline-flex items-center ${pillClass} bg-[var(--color-surface)]/90 text-[var(--color-ink-800)]`}
    >
      {chip.label}
    </span>
  );
}
