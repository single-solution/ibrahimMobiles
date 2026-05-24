"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Brand, Product as StorefrontProduct } from "@store/shared";

import { GradeBadge } from "@/components/shared/GradeBadge";
import { ProductImage } from "@/components/shared/ProductImage";
import { productHref } from "@/lib/catalog/productPaths";
import { getDefaultVariant, resolveVariantHeroImage } from "@/lib/productSummary";

const DESKTOP_SLOT_COUNT = 5;
const DESKTOP_CENTER_INDEX = 2;
const MOBILE_SLOT_COUNT = 3;
const MOBILE_CENTER_INDEX = 1;

const DESKTOP_TILT_BY_INDEX: Record<number, string> = {
  0: "-rotate-6",
  1: "-rotate-2",
  3: "rotate-2",
  4: "rotate-6",
};

interface HeroProductGalleryProps {
  products: StorefrontProduct[];
  brands: Brand[];
  variant: "desktop" | "mobile";
  empty: React.ReactNode;
}

interface GallerySlot {
  product: StorefrontProduct | null;
  slotIndex: number;
  isCenter: boolean;
}

function buildGallerySlots(
  products: StorefrontProduct[],
  centerIndex: number,
  slotCount: number,
  centerSlotIndex: number,
): GallerySlot[] {
  if (products.length === 0) {
    return [];
  }
  const normalizedCenter =
    ((centerIndex % products.length) + products.length) % products.length;

  return Array.from({ length: slotCount }, (_, slotIndex) => {
    const isCenter = slotIndex === centerSlotIndex;
    if (products.length === 1) {
      return {
        product: isCenter ? products[0] : null,
        slotIndex,
        isCenter,
      };
    }
    const offset = slotIndex - centerSlotIndex;
    const productIndex =
      (normalizedCenter + offset + products.length * 8) % products.length;
    return {
      product: products[productIndex],
      slotIndex,
      isCenter,
    };
  });
}

interface GalleryTileProps {
  product: StorefrontProduct;
  brands: Brand[];
  className?: string;
  imageSizes?: string;
  showCaption?: boolean;
  showGrade?: boolean;
}

function HeroGalleryTile({
  product,
  brands,
  className = "",
  imageSizes = "(max-width: 1024px) 30vw, 280px",
  showCaption = true,
  showGrade = true,
}: GalleryTileProps) {
  const brand = brands.find((candidate) => candidate.slug === product.brandSlug);
  const brandName = brand?.name ?? product.brandSlug;
  const defaultVariant = getDefaultVariant(product);
  const heroImage = resolveVariantHeroImage(product, defaultVariant);
  return (
    <Link
      href={productHref(product, { variant: defaultVariant })}
      className={`gallery-tile product-media-well group relative block rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] ${className}`}
    >
      <ProductImage
        image={heroImage}
        variant="card"
        name={product.name}
        brandName={brandName}
        brandSlug={product.brandSlug}
        sizes={imageSizes}
      />
      {showGrade && (
        <span className="absolute right-2 top-2 z-10">
          <GradeBadge
            categorySlug={product.categorySlug}
            gradeSlug={defaultVariant.gradeSlug}
            size="sm"
          />
        </span>
      )}
      {showCaption && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-2 pt-6 text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
            {brandName}
          </p>
          <p className="line-clamp-1 text-[12.5px] font-semibold text-white">
            {product.name}
          </p>
        </div>
      )}
    </Link>
  );
}

function EmptySlot({ className }: { className: string }) {
  return (
    <div
      className={`aspect-square rounded-[var(--radius-md)] ${className}`}
      aria-hidden
    />
  );
}

export function HeroProductGallery({
  products,
  brands,
  variant,
  empty,
}: HeroProductGalleryProps) {
  const [centerIndex, setCenterIndex] = useState(0);
  const isDesktop = variant === "desktop";
  const slotCount = isDesktop ? DESKTOP_SLOT_COUNT : MOBILE_SLOT_COUNT;
  const centerSlotIndex = isDesktop ? DESKTOP_CENTER_INDEX : MOBILE_CENTER_INDEX;
  const slots = buildGallerySlots(
    products,
    centerIndex,
    slotCount,
    centerSlotIndex,
  );

  const goPrev = useCallback(() => {
    setCenterIndex((current) => current - 1);
  }, []);

  const goNext = useCallback(() => {
    setCenterIndex((current) => current + 1);
  }, []);

  if (products.length === 0) {
    return empty;
  }

  const showNav = products.length > 1;
  const gridClass = isDesktop
    ? "grid grid-cols-5 items-center gap-2"
    : "grid grid-cols-3 items-center gap-1.5";
  const imageSizes = isDesktop
    ? "(max-width: 1024px) 18vw, 200px"
    : "(max-width: 640px) 30vw, 200px";

  return (
    <div className="relative w-full">
      {showNav && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Show previous phone in hero"
            className={
              isDesktop
                ? "absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-2 text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-canvas-deep)]"
                : "absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)]/95 p-1.5 text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] active:bg-[var(--color-canvas-deep)]"
            }
          >
            <ChevronLeft size={isDesktop ? 18 : 16} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Show next phone in hero"
            className={
              isDesktop
                ? "absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-2 text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-canvas-deep)]"
                : "absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)]/95 p-1.5 text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] active:bg-[var(--color-canvas-deep)]"
            }
          >
            <ChevronRight size={isDesktop ? 18 : 16} strokeWidth={2.4} />
          </button>
        </>
      )}

      <div className={showNav ? (isDesktop ? "px-10" : "px-8") : ""}>
        <div className={gridClass}>
          {slots.map((slot) => {
            if (!slot.product) {
              return (
                <EmptySlot
                  key={`empty-${slot.slotIndex}`}
                  className={isDesktop ? "" : ""}
                />
              );
            }
            const tilt = isDesktop
              ? DESKTOP_TILT_BY_INDEX[slot.slotIndex] ?? ""
              : slot.slotIndex === 0
                ? "-rotate-6"
                : slot.slotIndex === 2
                  ? "rotate-6"
                  : "";
            const tone = slot.isCenter
              ? isDesktop
                ? "z-10 scale-105 shadow-[var(--shadow-lg)]"
                : "z-10 scale-105 shadow-[var(--shadow-md)]"
              : "";
            return (
              <div
                key={`${slot.product.slug}-${slot.slotIndex}`}
                className={slot.isCenter ? "" : tilt}
              >
                <HeroGalleryTile
                  product={slot.product}
                  brands={brands}
                  className={`aspect-square ${tone}`}
                  imageSizes={imageSizes}
                  showCaption={slot.isCenter}
                  showGrade={slot.isCenter}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
