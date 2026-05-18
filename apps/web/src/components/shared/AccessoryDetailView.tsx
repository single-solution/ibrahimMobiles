"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BadgeCheck,
  Cable,
  Check,
  MessageCircle,
  Plug,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { GradeShowcase } from "@/components/shared/GradeShowcase";
import { ProductImage } from "@/components/shared/ProductImage";
import { ProductCard } from "@/components/shared/ProductCard";
import { VariantProvider, useVariantSelection } from "@/components/shared/VariantContext";
import { getGradeDescriptor } from "@/data/grades";
import {
  buildWhatsAppLink,
  calculateDiscountPercent,
  classNames,
  formatPrice,
  type Accessory,
  type AccessoryType,
  type AccessoryVariant,
  type ConnectorType,
  type Product,
} from "@store/shared";
import { useCart } from "@/lib/cart/useCart";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

const ADD_TO_CART_FLASH_MS = 1_500;
/** Highlight chips rendered above the variant selector (rest are dropped). */
const HIGHLIGHT_CHIPS_MAX = 3;
/** Gallery thumbnails surfaced in both mobile and desktop strips. */
const GALLERY_THUMB_COUNT = 6;

interface AccessoryDetailViewProps {
  accessory: Accessory;
  initialVariantId: string;
  /**
   * "More like this" rail — same-type accessories selected by the page
   * server component. Pre-filtered to exclude the current item.
   */
  relatedAccessories?: Product[];
}

const ACCESSORY_TYPE_LABEL: Record<AccessoryType, string> = {
  charger: "Charger",
  cable: "Cable",
  case: "Case",
  earbuds: "Earbuds",
  "screen-protector": "Screen guard",
  "power-bank": "Power bank",
  other: "Accessory",
};

export function AccessoryDetailView({
  accessory,
  initialVariantId,
  relatedAccessories,
}: AccessoryDetailViewProps) {
  const brandName = accessory.brandName ?? accessory.brandSlug;
  const related = relatedAccessories ?? [];

  return (
    <VariantProvider initialVariantId={initialVariantId}>
      {/* Mobile */}
      <div className="pb-[calc(80px+env(safe-area-inset-bottom,0px))] pt-2 md:hidden">
        <Gallery
          imageUrl={accessory.imageUrl}
          galleryUrls={accessory.galleryUrls}
          brandName={brandName}
          modelName={accessory.modelName}
          brandSlug={accessory.brandSlug}
          colorName={accessory.variants[0].colorName}
        />
        <div className="app-page">
          <div className="app-section">
            <Header accessory={accessory} brandName={brandName} />
            <VariantTiles accessory={accessory} />
            <CallToActions accessory={accessory} brandName={brandName} />
          </div>
          <GradeShowcase product={accessory} variant="mobile" />
          {related.length > 0 && (
            <section className="app-section">
              <div className="app-section-eyebrow">
                <span>More {ACCESSORY_TYPE_LABEL[accessory.accessoryType]}s</span>
                <Link href={"/shop/accessories"}>See all</Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {related.map((relatedProduct) => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-[1440px] px-6 pb-12 pt-8 md:block">
        <Breadcrumbs accessory={accessory} brandName={brandName} />
        <div className="mt-6 grid grid-cols-[1.1fr_1fr] gap-12">
          <DesktopGallery accessory={accessory} brandName={brandName} />
          <div className="space-y-6">
            <Header accessory={accessory} brandName={brandName} isDesktop />
            <VariantTiles accessory={accessory} isDesktop />
            <CallToActions accessory={accessory} brandName={brandName} isDesktop />
          </div>
        </div>
        <GradeShowcase product={accessory} variant="desktop" />
        {related.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-ink-900)]">
                More {ACCESSORY_TYPE_LABEL[accessory.accessoryType]}s
              </h2>
              <Link
                href={"/shop/accessories"}
                className="text-sm font-medium text-[var(--color-accent-700)] hover:underline"
              >
                See all accessories →
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-5">
              {related.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </VariantProvider>
  );
}

interface HeaderProps {
  accessory: Accessory;
  brandName: string;
  isDesktop?: boolean;
}

function Header({ accessory, brandName, isDesktop }: HeaderProps) {
  return (
    <div className={isDesktop ? "" : "mb-3"}>
      <p
        className={
          isDesktop
            ? "text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)]"
            : "text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)]"
        }
      >
        {brandName} · {ACCESSORY_TYPE_LABEL[accessory.accessoryType]}
      </p>
      <h1
        className={
          isDesktop
            ? "mt-2 text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--color-ink-900)]"
            : "mt-1 text-xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]"
        }
      >
        {accessory.modelName}
      </h1>
      {accessory.highlights.length > 0 && (
        <ul
          className={classNames(
            "mt-3 flex flex-wrap gap-1.5",
            isDesktop ? "md:gap-2" : "",
          )}
        >
          {accessory.highlights.slice(0, HIGHLIGHT_CHIPS_MAX).map((highlight) => (
            <li key={highlight}>
              <Pill tone="neutral" size="sm">
                {highlight}
              </Pill>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface VariantTilesProps {
  accessory: Accessory;
  isDesktop?: boolean;
}

function VariantTiles({ accessory, isDesktop }: VariantTilesProps) {
  const { selectedVariantId, setSelectedVariantId } = useVariantSelection();
  const selected =
    accessory.variants.find((variant) => variant.id === selectedVariantId)
    ?? accessory.variants[0];

  return (
    <div className={isDesktop ? "mt-6 space-y-4" : "mt-4 space-y-3"}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
          {accessory.variants.length} option{accessory.variants.length === 1 ? "" : "s"}
        </p>
        <PriceDisplay variant={selected} isDesktop={isDesktop} />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {accessory.variants.map((variant) => (
          <VariantTile
            key={variant.id}
            variant={variant}
            isSelected={selected.id === variant.id}
            onSelect={() => setSelectedVariantId(variant.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface VariantTileProps {
  variant: AccessoryVariant;
  isSelected: boolean;
  onSelect: () => void;
}

function VariantTile({ variant, isSelected, onSelect }: VariantTileProps) {
  const descriptor = getGradeDescriptor(variant.grade);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!variant.isInStock}
      className={classNames(
        "tap relative flex flex-col gap-2 rounded-[var(--radius-lg)] border p-3 text-left transition-colors",
        isSelected
          ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)]"
          : "border-[var(--color-ink-100)] bg-[var(--color-surface)] hover:border-[var(--color-ink-200)]",
        !variant.isInStock && "opacity-50",
      )}
    >
      <div className="flex items-center gap-1.5">
        <GradeBadge grade={variant.grade} size="sm" />
        <span className="text-[12px] font-medium text-[var(--color-ink-900)]">
          {descriptor.shortLabel}
        </span>
        {variant.isGenuine && (
          <span className="ml-auto inline-flex items-center gap-0.5 rounded-[var(--radius-md)] bg-[var(--color-ink-900)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-white">
            <BadgeCheck size={9} strokeWidth={2.8} /> OEM
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-ink-700)]">
        {variant.connector && variant.connector !== "n-a" && (
          <SpecChip>
            <Plug size={10} />
            {connectorLabel(variant.connector)}
          </SpecChip>
        )}
        {variant.wattage && (
          <SpecChip>
            <Zap size={10} />
            {variant.wattage}W
          </SpecChip>
        )}
        {variant.lengthMeters && (
          <SpecChip>
            <Cable size={10} />
            {variant.lengthMeters} m
          </SpecChip>
        )}
        <SpecChip>{variant.colorName}</SpecChip>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold tracking-tight text-[var(--color-ink-900)]">
          {formatPrice(variant.priceRupees)}
        </span>
        {!variant.isInStock && (
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
            Sold out
          </span>
        )}
        {variant.isInStock && isSelected && (
          <Check size={14} className="text-[var(--color-accent-700)]" strokeWidth={2.6} />
        )}
      </div>
      {variant.notes && (
        <p className="text-[11px] leading-snug text-[var(--color-ink-500)]">{variant.notes}</p>
      )}
    </button>
  );
}

function SpecChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-canvas-deep)] px-1.5 py-0.5">
      {children}
    </span>
  );
}

function PriceDisplay({ variant, isDesktop }: { variant: AccessoryVariant; isDesktop?: boolean }) {
  const discount = calculateDiscountPercent(variant.originalPriceRupees, variant.priceRupees);
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={
          isDesktop
            ? "text-2xl font-semibold tracking-tight text-[var(--color-ink-900)]"
            : "text-[17px] font-semibold tracking-tight text-[var(--color-ink-900)]"
        }
      >
        {formatPrice(variant.priceRupees)}
      </span>
      {discount > 0 && (
        <>
          <span className="text-[11px] text-[var(--color-ink-400)] line-through md:text-[12px]">
            {formatPrice(variant.originalPriceRupees)}
          </span>
          <span className="rounded-[var(--radius-md)] bg-[var(--color-accent-100)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-accent-800)]">
            -{discount}%
          </span>
        </>
      )}
    </div>
  );
}

function CallToActions({
  accessory,
  brandName,
  isDesktop,
}: {
  accessory: Accessory;
  brandName: string;
  isDesktop?: boolean;
}) {
  const { selectedVariantId } = useVariantSelection();
  const cart = useCart();
  const { whatsappNumber } = useStoreSettings();
  const [hasJustBeenAdded, setHasJustBeenAdded] = useState(false);
  const selected =
    accessory.variants.find((variant) => variant.id === selectedVariantId)
    ?? accessory.variants[0];
  const message = `Salam! I'd like to order the ${brandName} ${accessory.modelName} (${selected.colorName}) for ${formatPrice(selected.priceRupees)}.`;

  const handleAddToCart = () => {
    cart.addItem({
      productId: accessory.id,
      variantId: selected.id,
      productName: accessory.modelName,
      brandSlug: accessory.brandSlug,
      imageUrl: accessory.imageUrl,
      colorName: selected.colorName,
      unitPriceRupees: selected.priceRupees,
      category: "accessory",
      productSlug: accessory.slug,
    });
    setHasJustBeenAdded(true);
    window.setTimeout(() => setHasJustBeenAdded(false), ADD_TO_CART_FLASH_MS);
  };

  return (
    <div className={classNames("flex flex-col gap-2", isDesktop ? "mt-2 sm:flex-row" : "mt-4")}>
      <Button
        variant="primary"
        size={isDesktop ? "lg" : "md"}
        className="cta-arrow flex-1"
        leadingIcon={
          hasJustBeenAdded ? <Check size={isDesktop ? 16 : 14} /> : <ShoppingBag size={isDesktop ? 16 : 14} />
        }
        disabled={!selected.isInStock}
        onClick={handleAddToCart}
      >
        {!selected.isInStock
          ? "Sold out"
          : hasJustBeenAdded
            ? "Added to cart"
            : "Add to cart"}
      </Button>
      <a
        href={buildWhatsAppLink(message, whatsappNumber)}
        target="_blank"
        rel="noopener"
        className={classNames(
          "tap inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] font-semibold text-[var(--color-ink-800)] transition-colors hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]",
          isDesktop ? "h-12 px-5 text-[14px]" : "h-10 px-4 text-[13.5px]",
        )}
      >
        <MessageCircle size={isDesktop ? 16 : 14} />
        WhatsApp order
      </a>
    </div>
  );
}

function Gallery({
  imageUrl,
  galleryUrls,
  brandName,
  modelName,
  brandSlug,
  colorName,
}: {
  imageUrl: string;
  galleryUrls: string[];
  brandName: string;
  modelName: string;
  brandSlug: string;
  colorName: string;
}) {
  return (
    <>
      <div className="relative aspect-square w-full bg-[var(--color-canvas-deep)]">
        <ProductImage
          imageUrl={imageUrl}
          brandName={brandName}
          modelName={modelName}
          colorName={colorName}
          brandSlug={brandSlug}
          sizes="100vw"
          priority
        />
      </div>
      {galleryUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5 no-scrollbar">
          {galleryUrls.slice(0, GALLERY_THUMB_COUNT).map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative aspect-square w-14 shrink-0 overflow-hidden rounded-md border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]"
            >
              <ProductImage
                imageUrl={url}
                brandName={brandName}
                modelName={modelName}
                colorName={colorName}
                brandSlug={brandSlug}
                sizes="64px"
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function DesktopGallery({ accessory, brandName }: { accessory: Accessory; brandName: string }) {
  const { selectedVariantId } = useVariantSelection();
  const selected =
    accessory.variants.find((variant) => variant.id === selectedVariantId)
    ?? accessory.variants[0];
  const [active, setActive] = useState(0);
  const thumbs = accessory.galleryUrls.length > 0 ? accessory.galleryUrls : [accessory.imageUrl];
  const heroUrl = thumbs[active] ?? accessory.imageUrl;
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-canvas-deep)]">
        <ProductImage
          imageUrl={heroUrl}
          brandName={brandName}
          modelName={accessory.modelName}
          colorName={selected.colorName}
          brandSlug={accessory.brandSlug}
          sizes="(min-width: 1280px) 720px, 50vw"
          priority
        />
      </div>
      {thumbs.length > 1 && (
        <div className="mt-3 flex gap-2">
          {thumbs.slice(0, GALLERY_THUMB_COUNT).map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              className={classNames(
                "relative aspect-square w-16 overflow-hidden rounded-[var(--radius-md)] border bg-[var(--color-canvas-deep)] transition-colors",
                index === active
                  ? "border-[var(--color-accent-500)]"
                  : "border-[var(--color-ink-100)] hover:border-[var(--color-ink-200)]",
              )}
            >
              <ProductImage
                imageUrl={url}
                brandName={brandName}
                modelName={accessory.modelName}
                colorName={selected.colorName}
                brandSlug={accessory.brandSlug}
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface BreadcrumbsProps {
  accessory: Accessory;
  brandName: string;
}

function Breadcrumbs({ accessory, brandName }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-[var(--color-ink-500)]">
      <Link href="/shop" className="link-underline hover:text-[var(--color-ink-800)]">
        Shop
      </Link>
      <span>/</span>
      <Link
        href="/shop/accessories"
        className="link-underline hover:text-[var(--color-ink-800)]"
      >
        Accessories
      </Link>
      <span>/</span>
      <Link
        href={`/shop/accessories?brand=${accessory.brandSlug}`}
        className="link-underline hover:text-[var(--color-ink-800)]"
      >
        {brandName}
      </Link>
      <span>/</span>
      <span className="text-[var(--color-ink-800)]">{accessory.modelName}</span>
    </nav>
  );
}

function connectorLabel(connector: ConnectorType): string {
  switch (connector) {
    case "usb-c":
      return "USB-C";
    case "lightning":
      return "Lightning";
    case "micro-usb":
      return "Micro-USB";
    case "wireless":
      return "Wireless";
    default:
      return "—";
  }
}
