"use client";

import { useMemo, useState } from "react";
import {
  Check,
  GitCompare,
  Info,
  MessageCircle,
  ShoppingBag,
} from "lucide-react";

import {
  buildWhatsAppLink,
  classNames,
  formatPrice,
  type Product,
  type StorefrontVariant,
} from "@store/shared";

import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { CompareVariants } from "@/components/shared/CompareVariants";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { useVariantSelection } from "@/components/shared/VariantContext";

import { useCart } from "@/lib/cart/useCart";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";
import { useGrade } from "@/lib/storefront/storefrontReferenceContext";

const ADD_TO_CART_FLASH_MS = 1_500;

const isVariantInStock = (variant: StorefrontVariant): boolean =>
  (variant.quantity ?? 0) > 0;

const HUMANISE_ATTR = (slug: string): string =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

interface VariantSelectorProps {
  product: Product;
  brandName: string;
}

/**
 * Product detail variant picker (Phase 1 generic shape).
 *
 * Schema awareness (PLAN.md §10):
 *   - Variant differentiators (`storage`, `colour`, `RAM`, `connector`,
 *     etc.) live in `Variant.attributes` as a free-form `Record<string,
 *     string>`. The PDP renders that record as a generic spec grid so
 *     any category — phones, accessories, gadgets, future ones — picks
 *     up correctly without a code change.
 *   - The price-strikethrough and "discount" UI is gone (no
 *     `originalPriceRupees` on a variant). Promotions surface via the
 *     `Offer` collection (Phase 7).
 *   - Cart lines carry the full `StoredImage` + `gradeSlug` so the cart
 *     drawer can render the right resolution and the grade chip without
 *     a re-fetch.
 */
export function VariantSelector({ product, brandName }: VariantSelectorProps) {
  const { selectedVariantId, setSelectedVariantId } = useVariantSelection();
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const cart = useCart();
  const [hasJustBeenAdded, setHasJustBeenAdded] = useState(false);

  const selected =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants[0];

  const inStock = isVariantInStock(selected);
  const gradeDescriptor = useGrade(product.categorySlug, selected.gradeSlug);
  const gradeLabelForCopy = gradeDescriptor?.label ?? selected.gradeSlug;
  const showCompare = product.variants.length > 1;
  const heroImage = selected.images?.[0];

  const attributeSummary = useMemo(() => {
    const entries = Object.entries(selected.attributes ?? {});
    if (entries.length === 0) {
      return "";
    }
    return entries.map(([, value]) => value).join(", ");
  }, [selected.attributes]);

  const whatsappMessage = `Salam! I'd like to order the ${brandName} ${product.name} — Grade ${gradeLabelForCopy}${
    attributeSummary ? ` (${attributeSummary})` : ""
  } for ${formatPrice(selected.priceRupees)}.`;

  const handleAddToCart = () => {
    if (!heroImage) {
      return;
    }
    cart.addItem({
      productId: product.id,
      variantId: selected.id,
      productName: product.name,
      brandSlug: product.brandSlug,
      brandName,
      image: heroImage,
      unitPriceRupees: selected.priceRupees,
      categorySlug: product.categorySlug,
      productSlug: product.slug,
      gradeSlug: selected.gradeSlug,
      attributes: selected.attributes ?? {},
    });
    setHasJustBeenAdded(true);
    window.setTimeout(() => setHasJustBeenAdded(false), ADD_TO_CART_FLASH_MS);
  };

  return (
    <div className="space-y-4 md:space-y-7">
      <div>
        <h1 className="text-xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] sm:text-2xl md:text-6xl md:leading-[1] md:tracking-[-0.03em]">
          {product.name}
        </h1>
      </div>

      <PriceBlock priceRupees={selected.priceRupees} />

      <SpecGrid variant={selected} />

      <VariantList
        variants={product.variants}
        categorySlug={product.categorySlug}
        selectedVariantId={selected.id}
        onSelect={setSelectedVariantId}
        onOpenCompare={showCompare ? () => setIsCompareOpen(true) : undefined}
      />

      <PurchaseActions
        isInStock={inStock}
        onAddToCart={handleAddToCart}
        hasJustBeenAdded={hasJustBeenAdded}
      />

      <MobileStickyCta
        onAddToCart={handleAddToCart}
        hasJustBeenAdded={hasJustBeenAdded}
        priceRupees={selected.priceRupees}
        isInStock={inStock}
        whatsappMessage={whatsappMessage}
      />

      {isCompareOpen && (
        <CompareVariants
          product={product}
          brandName={brandName}
          selectedVariantId={selected.id}
          onClose={() => setIsCompareOpen(false)}
          onSelect={setSelectedVariantId}
        />
      )}
    </div>
  );
}

interface MobileStickyCtaProps {
  priceRupees: number;
  isInStock: boolean;
  whatsappMessage: string;
  onAddToCart: () => void;
  hasJustBeenAdded: boolean;
}

function MobileStickyCta({
  priceRupees,
  isInStock,
  whatsappMessage,
  onAddToCart,
  hasJustBeenAdded,
}: MobileStickyCtaProps) {
  const { whatsappNumber } = useStoreSettings();
  return (
    <div
      className="fixed inset-x-0 z-30 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)]/95 px-3 pt-2.5 backdrop-blur md:hidden"
      style={{
        bottom: "calc(var(--mobile-tabbar-h) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "10px",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
            Your selection
          </p>
          <p className="text-base font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
            {formatPrice(priceRupees)}
          </p>
        </div>
        {isInStock ? (
          <>
            <a
              href={buildWhatsAppLink(whatsappMessage, whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Inquire on WhatsApp"
              className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-full)] bg-[var(--color-whatsapp)] text-white shadow-[var(--shadow-sm)] active:bg-[var(--color-whatsapp-dark)]"
            >
              <MessageCircle size={16} className="fill-white" />
            </a>
            <button
              type="button"
              onClick={onAddToCart}
              aria-live="polite"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent-500)] px-4 text-[13px] font-semibold text-[var(--color-ink-900)] active:bg-[var(--color-accent-600)]"
            >
              {hasJustBeenAdded ? <Check size={14} /> : <ShoppingBag size={14} />}
              {hasJustBeenAdded ? "Added" : "Add to cart"}
            </button>
          </>
        ) : (
          <span className="inline-flex h-10 shrink-0 items-center rounded-[var(--radius-full)] bg-[var(--color-ink-100)] px-4 text-[13px] font-semibold text-[var(--color-ink-500)]">
            Sold out
          </span>
        )}
      </div>
    </div>
  );
}

interface PriceBlockProps {
  priceRupees: number;
}

function PriceBlock({ priceRupees }: PriceBlockProps) {
  const bankTransferPrice = Math.round(priceRupees * 0.95);
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3.5 md:p-5">
      <div className="flex flex-wrap items-baseline gap-2 md:gap-3">
        <span className="text-xl font-semibold leading-none tracking-tight text-[var(--color-ink-900)] sm:text-2xl md:text-5xl md:tracking-[-0.03em]">
          {formatPrice(priceRupees)}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--color-ink-600)] md:mt-2 md:text-sm">
        Or{" "}
        <span className="font-semibold text-[var(--color-accent-700)]">
          {formatPrice(bankTransferPrice)}
        </span>{" "}
        with bank transfer (5% off)
      </p>
    </div>
  );
}

interface SpecGridProps {
  variant: StorefrontVariant;
}

function SpecGrid({ variant }: SpecGridProps) {
  const attributeEntries = Object.entries(variant.attributes ?? {});
  const specs: Array<{ label: string; value: string }> = attributeEntries.map(
    ([slug, value]) => ({ label: HUMANISE_ATTR(slug), value }),
  );
  if (variant.warrantyMonths) {
    specs.push({ label: "Warranty", value: `${variant.warrantyMonths}-mo` });
  }
  if (specs.length === 0) {
    return null;
  }
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
      {specs.map((spec) => (
        <div
          key={spec.label}
          className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-2.5 md:p-3"
        >
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-500)] md:text-xs">
            <Info size={14} />
            <span>{spec.label}</span>
          </div>
          <p className="mt-0.5 text-[13px] font-semibold text-[var(--color-ink-900)] md:mt-1 md:text-sm">
            {spec.value}
          </p>
        </div>
      ))}
    </div>
  );
}

interface VariantListProps {
  variants: StorefrontVariant[];
  categorySlug: string;
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
  onOpenCompare?: () => void;
}

function VariantList({
  variants,
  categorySlug,
  selectedVariantId,
  onSelect,
  onOpenCompare,
}: VariantListProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-700)] md:text-sm">
          Available options
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[var(--color-ink-500)] md:text-xs">
            {variants.length} {variants.length === 1 ? "option" : "options"}
          </span>
          {onOpenCompare && (
            <button
              type="button"
              onClick={onOpenCompare}
              className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-ink-800)] transition-colors hover:border-[var(--color-ink-900)] hover:text-[var(--color-ink-900)] md:gap-1.5 md:px-2.5 md:py-1.5 md:text-xs"
            >
              <GitCompare size={11} />
              Compare
            </button>
          )}
        </div>
      </div>
      <ul className="space-y-2">
        {variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            categorySlug={categorySlug}
            isSelected={variant.id === selectedVariantId}
            onSelect={() => onSelect(variant.id)}
          />
        ))}
      </ul>
    </div>
  );
}

interface VariantRowProps {
  variant: StorefrontVariant;
  categorySlug: string;
  isSelected: boolean;
  onSelect: () => void;
}

function VariantRow({
  variant,
  categorySlug,
  isSelected,
  onSelect,
}: VariantRowProps) {
  const inStock = isVariantInStock(variant);
  const attributeSummary = Object.entries(variant.attributes ?? {})
    .map(([, value]) => value)
    .join(" · ");
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={!inStock}
        aria-pressed={isSelected}
        className={classNames(
          "group flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] border p-3 text-left transition-all md:gap-4 md:p-4",
          isSelected
            ? "border-[var(--color-ink-900)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
            : "border-[var(--color-ink-100)] bg-[var(--color-surface)] hover:border-[var(--color-ink-300)]",
          !inStock && "opacity-60",
        )}
      >
        <span
          aria-hidden
          className={classNames(
            "grid size-4 shrink-0 place-items-center rounded-full border-2 transition-colors md:size-5",
            isSelected
              ? "border-[var(--color-accent-700)] bg-[var(--color-accent-700)] text-white"
              : "border-[var(--color-ink-300)] bg-[var(--color-surface)]",
          )}
        >
          {isSelected && <Check size={10} strokeWidth={3} className="md:size-3" />}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1 md:gap-2">
          <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
            <GradeBadge
              categorySlug={categorySlug}
              gradeSlug={variant.gradeSlug}
              size="sm"
            />
            {!inStock && (
              <Pill tone="danger" size="sm">
                Sold out
              </Pill>
            )}
          </div>
          {attributeSummary && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--color-ink-600)] md:gap-x-3 md:gap-y-1 md:text-xs">
              <span className="line-clamp-1">{attributeSummary}</span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <p className="text-sm font-semibold tracking-tight text-[var(--color-ink-900)] md:text-lg">
            {formatPrice(variant.priceRupees)}
          </p>
        </div>
      </button>
    </li>
  );
}

interface PurchaseActionsProps {
  isInStock: boolean;
  onAddToCart: () => void;
  hasJustBeenAdded: boolean;
}

function PurchaseActions({ isInStock, onAddToCart, hasJustBeenAdded }: PurchaseActionsProps) {
  return (
    <div className="hidden space-y-2.5 md:block md:space-y-3">
      <Button
        variant="primary"
        size="md"
        leadingIcon={hasJustBeenAdded ? <Check size={16} /> : <ShoppingBag size={16} />}
        className="w-full md:h-13 md:px-7 md:text-base"
        disabled={!isInStock}
        onClick={onAddToCart}
      >
        {!isInStock
          ? "Currently sold out"
          : hasJustBeenAdded
            ? "Added to cart"
            : "Add to cart"}
      </Button>
    </div>
  );
}
