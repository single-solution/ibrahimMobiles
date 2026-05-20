"use client";

import Link from "next/link";
import { Layers } from "lucide-react";

import { formatPrice, type Product } from "@store/shared";

import { GradeBadge } from "@/components/shared/GradeBadge";
import { ProductImage } from "@/components/shared/ProductImage";
import { WishlistButton } from "@/components/shared/WishlistButton";
import {
  getDefaultVariant,
  isProductInStock,
} from "@/lib/productSummary";
import { useProductHref } from "@/lib/storefront/storefrontReferenceContext";

interface ProductCardProps {
  product: Product;
}

/**
 * Compact storefront tile.
 *
 * Phase 1 contract: works against the dynamic catalog. Per-category spec
 * chips (storage / battery / connector / wattage) live on
 * `Variant.attributes` now; rendering them generically is a Phase 6
 * (Storefront PDP alignment) job — for now we surface the default
 * variant's grade, price, and option count only. That matches the "no
 * crash, no console errors" mandate of T1.17.
 */
export function ProductCard({ product }: ProductCardProps) {
  const brandName = product.brandName ?? product.brandSlug;
  const defaultVariant = getDefaultVariant(product);
  const href = useProductHref(product);
  const inStock = isProductInStock(product);
  const heroImage = defaultVariant.images?.[0];
  const variantCount = product.variants.length;
  const isMultiVariant = variantCount > 1;

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
              fromPriceRupees={defaultVariant.priceRupees}
            />
          ) : null}

          <div className="absolute right-1.5 top-1.5 z-10 flex flex-col items-end gap-1 md:right-3 md:top-3 md:gap-1.5">
            <GradeBadge
              categorySlug={product.categorySlug}
              gradeSlug={defaultVariant.gradeSlug}
              size="sm"
            />
          </div>

          {!inStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-ink-900)]/45 backdrop-blur-[1px]">
              <span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-900)] shadow-[var(--shadow-md)] md:px-4 md:py-1.5 md:text-[11px]">
                Sold out
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
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-2.5 py-2 md:px-3 md:py-2.5">
            <p className="text-[15px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)] md:text-[17px]">
              {formatPrice(defaultVariant.priceRupees)}
            </p>
            {isMultiVariant && (
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
