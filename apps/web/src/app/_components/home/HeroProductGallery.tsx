"use client";

import { useEffect, useMemo, useState } from "react";

import type { Brand, Product as StorefrontProduct } from "@store/shared";

import { ProductImage } from "@/components/shared/ProductImage";
import { TiltCard } from "@/components/shared/motion/TiltCard";
import { resolveProductHeroImage } from "@/lib/productSummary";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

const DESKTOP_SLOT_COUNT = 5;
const MOBILE_SLOT_COUNT = 3;

const DESKTOP_TILT_BY_SLOT: Record<number, string> = {
  0: "-rotate-6",
  1: "-rotate-2",
  3: "rotate-2",
  4: "rotate-6",
};

const MOBILE_TILT_BY_SLOT: Record<number, string> = {
  0: "-rotate-6",
  2: "rotate-6",
};

/**
 * Staggered float delays (seconds) per tile so the fan breathes out of
 * phase. Long enough that the eye never catches two tiles moving in lock
 * step but short enough that the whole fan stays alive.
 */
const TILE_FLOAT_DELAYS = ["0s", "0.9s", "1.8s", "2.7s", "3.6s"];

interface HeroProductGalleryProps {
  products: StorefrontProduct[];
  brands: Brand[];
  variant: "desktop" | "mobile";
  empty: React.ReactNode;
}

interface BrandLookup {
  get: (slug: string) => string;
}

function useBrandLookup(brands: Brand[]): BrandLookup {
  return useMemo(() => {
    const map = new Map(brands.map((brand) => [brand.slug, brand.name]));
    return { get: (slug: string) => map.get(slug) ?? slug };
  }, [brands]);
}

/**
 * Pick a stable window of products for this mount. Starting at a random
 * offset means a different fan greets the visitor on each visit (Next.js
 * caches the homepage RSC between client-side navigations, so a fixed
 * offset would feel stuck until a full reload) — but within a single
 * mount the selection never changes, so nothing visibly shuffles.
 */
function useStableProductWindow(
  products: StorefrontProduct[],
  slotCount: number,
): StorefrontProduct[] {
  const [startOffset, setStartOffset] = useState(0);

  useEffect(() => {
    if (products.length <= slotCount) return;
    scheduleStateUpdate(() => {
      setStartOffset(Math.floor(Math.random() * products.length));
    });
  }, [products.length, slotCount]);

  return useMemo(() => {
    if (products.length === 0) return [];
    const window: StorefrontProduct[] = [];
    for (let i = 0; i < slotCount; i += 1) {
      const product = products[(startOffset + i) % products.length];
      if (product) window.push(product);
    }
    return window;
  }, [products, slotCount, startOffset]);
}

interface FanTileProps {
  product: StorefrontProduct;
  brandLookup: BrandLookup;
  imageSizes: string;
  tilt: string;
  isCenter: boolean;
  isDesktop: boolean;
  floatDelay: string;
  /** Preload this tile's image as `priority` for LCP — the homepage's
   *  hero fan is the largest visual block above the fold, so the centre
   *  tile is by far the best LCP candidate. */
  priority: boolean;
}

function HeroGalleryTile({
  product,
  brandLookup,
  imageSizes,
  tilt,
  isCenter,
  isDesktop,
  floatDelay,
  priority,
}: FanTileProps) {
  const brandName = brandLookup.get(product.brandSlug);
  const heroImage = resolveProductHeroImage(product);
  // Centre tile pops forward with a soft shadow; side tiles tilt and fade
  // back a touch so the eye lands on the middle of the fan. Tone is static
  // — nothing here changes after first paint, so the only motion is the
  // ambient float.
  const tone = isCenter
    ? isDesktop
      ? "z-10 scale-105 shadow-[var(--shadow-lg)]"
      : "z-10 scale-105 shadow-[var(--shadow-md)]"
    : `opacity-90 ${tilt}`;
  return (
    <div
      className="hero-tile-float"
      style={{ "--hero-float-delay": floatDelay } as React.CSSProperties}
    >
      <TiltCard
        intensity={isCenter ? 14 : 10}
        hoverScale={isCenter ? 1.1 : 1.06}
        className="aspect-square"
      >
        <div
          className={`product-media-well group relative block size-full rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] ${tone}`}
        >
          <div className="tilt-parallax absolute inset-0 size-full">
            <ProductImage
              image={heroImage}
              variant="card"
              name={product.name}
              brandName={brandName}
              brandSlug={product.brandSlug}
              sizes={imageSizes}
              priority={priority}
            />
          </div>
        </div>
      </TiltCard>
    </div>
  );
}

function EmptySlot() {
  return (
    <div
      className="aspect-square rounded-[var(--radius-md)]"
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
  const settings = useStoreSettings();
  const brandLookup = useBrandLookup(brands);
  const isDesktop = variant === "desktop";
  const slotCount = isDesktop ? DESKTOP_SLOT_COUNT : MOBILE_SLOT_COUNT;
  const centerSlotIndex = Math.floor(slotCount / 2);

  const tiles = useStableProductWindow(products, slotCount);

  if (products.length === 0) {
    return empty;
  }

  const gridClass = isDesktop
    ? "grid grid-cols-5 items-center gap-2"
    : "grid grid-cols-3 items-center gap-1.5";
  const imageSizes = isDesktop
    ? "(max-width: 1024px) 18vw, 200px"
    : "(max-width: 640px) 30vw, 200px";

  return (
    <div
      className="relative w-full"
      role="img"
      aria-label={`Recently graded products at ${settings.siteName}`}
    >
      <div className={gridClass}>
        {Array.from({ length: slotCount }).map((_, slotIndex) => {
          const product = tiles[slotIndex];
          if (!product) {
            return <EmptySlot key={`empty-${slotIndex}`} />;
          }
          const tilt = isDesktop
            ? DESKTOP_TILT_BY_SLOT[slotIndex] ?? ""
            : MOBILE_TILT_BY_SLOT[slotIndex] ?? "";
          return (
            <HeroGalleryTile
              key={`${product.id}-${slotIndex}`}
              product={product}
              brandLookup={brandLookup}
              imageSizes={imageSizes}
              tilt={tilt}
              isCenter={slotIndex === centerSlotIndex}
              isDesktop={isDesktop}
              floatDelay={
                TILE_FLOAT_DELAYS[slotIndex % TILE_FLOAT_DELAYS.length] ?? "0s"
              }
              priority={slotIndex === centerSlotIndex}
            />
          );
        })}
      </div>
    </div>
  );
}
