"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, MessageCircle, Settings2, ShoppingBag } from "lucide-react";

import {
  buildWhatsAppLink,
  classNames,
  formatPrice,
  resolveVariantAttributeLabel,
  type AttributeDescriptor,
  type GradeDescriptor,
  type Product,
  type StorefrontVariant,
} from "@store/shared";

import { toAttributeLabelSource } from "@/lib/catalog/attributeLabels";

import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useVariantSelection } from "@/components/shared/VariantContext";

import {
  attributeValuesOnVariant,
  findVariantBySelection,
  getRequiredAttributeSlugsForProduct,
  GRADE_DIMENSION_KEY,
  hasPdpConfigurationInSearch,
  isPdpSelectionComplete,
  parsePdpSelectionFromSearch,
  resolvePickerSelection,
  selectionFromVariant,
  selectionSignature,
  selectionToUrlPatch,
} from "@/lib/catalog/pdpSelection";
import { useCart } from "@/lib/cart/useCart";
import { usePdpUrlParams } from "@/lib/storefront/usePdpUrlParams";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";
import {
  useAttributesForCategory,
  useGradesForCategory,
} from "@/lib/storefront/storefrontReferenceContext";

const ADD_TO_CART_FLASH_MS = 1_500;

const isVariantInStock = (variant: StorefrontVariant): boolean =>
  (variant.quantity ?? 0) > 0;

interface VariantSelectorProps {
  product: Product;
  brandName: string;
}

/**
 * Product detail configurator — instead of one row per variant, the
 * shopper picks each attribute (grade, storage, colour…) independently
 * and the selector resolves to the matching variant. When a combination
 * isn't stocked, the closest variant is auto-selected with an inline
 * "ask on WhatsApp" hint.
 */
function hasSelectionValues(selection: Record<string, string>): boolean {
  return Object.values(selection).some((value) => Boolean(value));
}

export function VariantSelector({ product, brandName }: VariantSelectorProps) {
  const { selectedVariantId, setSelectedVariantId, setGalleryGradeSlug } =
    useVariantSelection();
  const { searchParams, replace } = usePdpUrlParams();
  const cart = useCart();
  const [hasJustBeenAdded, setHasJustBeenAdded] = useState(false);
  const [addQuantity, setAddQuantity] = useState(1);
  const categoryAttributes = useAttributesForCategory(product.categorySlug);
  const grades = useGradesForCategory(product.categorySlug);
  const attributeSlugs = useMemo(
    () => categoryAttributes.map((row) => row.slug),
    [categoryAttributes],
  );
  const requiredAttributeSlugs = useMemo(
    () => getRequiredAttributeSlugsForProduct(product, attributeSlugs),
    [product, attributeSlugs],
  );
  const requiredAttributeLabels = useMemo(
    () =>
      requiredAttributeSlugs.map(
        (slug) =>
          categoryAttributes.find((row) => row.slug === slug)?.label ?? slug,
      ),
    [requiredAttributeSlugs, categoryAttributes],
  );
  const pendingSelectionSigRef = useRef<string | null>(null);

  const syncSelectionToUrl = useCallback(
    (selection: Record<string, string>) => {
      const signature = selectionSignature(selection);
      if (!hasSelectionValues(selection)) {
        return;
      }
      pendingSelectionSigRef.current = signature;
      replace(selectionToUrlPatch(selection, attributeSlugs));
    },
    [attributeSlugs, replace],
  );
  const dimensions = useMemo(
    () => buildDimensions(product, categoryAttributes, grades),
    [product, categoryAttributes, grades],
  );

  const selected =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants[0] ??
    EMPTY_VARIANT;

  /** Shopper’s chip picks — owned by us. Updated only by explicit code paths
   *  (chip click, URL hydration) so multi-value picks survive. */
  const [pickerSelection, setPickerSelection] = useState(() =>
    selectionFromVariant(selected),
  );

  useEffect(() => {
    const searchRecord = Object.fromEntries(searchParams.entries());
    const fromUrl = parsePdpSelectionFromSearch(searchRecord, attributeSlugs);
    const urlSignature = selectionSignature(fromUrl);
    const pending = pendingSelectionSigRef.current;

    if (pending !== null && urlSignature !== pending) {
      return;
    }
    if (pending !== null && urlSignature === pending) {
      pendingSelectionSigRef.current = null;
    }

    if (!hasPdpConfigurationInSearch(searchRecord, attributeSlugs)) {
      return;
    }

    // Bad URL (combination doesn't exist on any variant) → fall back to the
    // default variant and drop the bad params. No reload, no banner — just a
    // clean reset matching a fresh PDP load.
    const exact = findVariantBySelection(product.variants, fromUrl);
    if (!exact) {
      const currentVariant =
        product.variants.find((row) => row.id === selectedVariantId) ??
        product.variants[0] ??
        EMPTY_VARIANT;
      const fallbackSelection = selectionFromVariant(currentVariant);
      pendingSelectionSigRef.current = selectionSignature(fallbackSelection);
      setPickerSelection(fallbackSelection);
      setSelectedVariantId(currentVariant.id);
      setGalleryGradeSlug(currentVariant.gradeSlug);
      syncSelectionToUrl(fallbackSelection);
      return;
    }

    setPickerSelection(fromUrl);
    setSelectedVariantId(exact.id);
    setGalleryGradeSlug(exact.gradeSlug);
  }, [
    searchParams,
    attributeSlugs,
    product,
    selectedVariantId,
    setSelectedVariantId,
    setGalleryGradeSlug,
    syncSelectionToUrl,
  ]);

  useEffect(() => {
    if (
      hasPdpConfigurationInSearch(
        Object.fromEntries(searchParams.entries()),
        attributeSlugs,
      )
    ) {
      return;
    }
    syncSelectionToUrl(selectionFromVariant(selected));
  }, [searchParams, attributeSlugs, selected, syncSelectionToUrl]);

  const currentSelection = pickerSelection;

  const resolvedVariant = useMemo(
    () => findVariantBySelection(product.variants, currentSelection),
    [product.variants, currentSelection],
  );

  const isExactMatch = Boolean(resolvedVariant);
  const isComplete = useMemo(
    () => isPdpSelectionComplete(currentSelection, requiredAttributeSlugs),
    [currentSelection, requiredAttributeSlugs],
  );
  const missingAttributeLabels = useMemo(
    () =>
      requiredAttributeSlugs
        .map((slug, index) =>
          currentSelection[slug] ? null : requiredAttributeLabels[index],
        )
        .filter((label): label is string => Boolean(label)),
    [currentSelection, requiredAttributeSlugs, requiredAttributeLabels],
  );

  const inStock = isVariantInStock(selected);
  const stockQuantity = Math.max(0, selected.quantity ?? 0);
  const cartLineId =
    selected.id.length > 0 ? `${product.id}:${selected.id}` : "";
  const quantityInCart =
    cart.items.find((line) => line.id === cartLineId)?.quantity ?? 0;
  const remainingStock = Math.max(0, stockQuantity - quantityInCart);
  const maxSelectableQuantity = remainingStock;
  const orderQuantity =
    maxSelectableQuantity > 0
      ? Math.min(addQuantity, maxSelectableQuantity)
      : addQuantity;

  const activeGrade = grades.find((row) => row.slug === selected.gradeSlug);
  const gradeLabelForCopy = activeGrade?.label ?? selected.gradeSlug;
  const heroImage = selected.images?.[0];

  const attributeSummary = useMemo(
    () => describeSelection(selected, categoryAttributes),
    [selected, categoryAttributes],
  );

  const whatsappMessage = `Salam! I'd like to order the ${brandName} ${product.name} — Grade ${gradeLabelForCopy}${
    attributeSummary ? ` (${attributeSummary})` : ""
  } for ${formatPrice(selected.priceRupees)}.`;

  const handlePickOption = (dimensionKey: string, optionKey: string) => {
    const proposed = { ...currentSelection, [dimensionKey]: optionKey };
    const { variant, selection: resolvedSelection } = resolvePickerSelection(
      product.variants,
      proposed,
      dimensionKey,
    );
    pendingSelectionSigRef.current = selectionSignature(resolvedSelection);
    if (dimensionKey === GRADE_DIMENSION_KEY) {
      setGalleryGradeSlug(optionKey);
    }
    setPickerSelection(resolvedSelection);
    syncSelectionToUrl(resolvedSelection);
    setSelectedVariantId(variant.id);
    setAddQuantity(1);
  };

  const handleAddToCart = () => {
    if (!selected.id || !heroImage || !inStock) {
      return;
    }
    const quantityToAdd = orderQuantity;
    if (quantityToAdd <= 0) {
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
      quantity: quantityToAdd,
      maxQuantity: stockQuantity,
    });
    setHasJustBeenAdded(true);
    window.setTimeout(() => setHasJustBeenAdded(false), ADD_TO_CART_FLASH_MS);
  };

  return (
    <div className="space-y-3 md:flex md:h-full md:min-h-0 md:flex-col md:justify-between md:space-y-0">
      <header className="shrink-0 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-accent-50)]/40 px-3 py-2.5 shadow-[var(--shadow-sm)] md:px-4 md:py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)] md:text-[11px]">
          {brandName}
        </p>
        <h1 className="mt-0.5 text-lg font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] sm:text-xl md:mt-1 md:text-4xl md:leading-[1.08] md:tracking-[-0.02em]">
          {product.name}
        </h1>
      </header>

      <div className="md:flex md:min-h-0 md:flex-1 md:flex-col md:justify-center md:gap-3">
        <Configurator
          dimensions={dimensions}
          variants={product.variants}
          currentSelection={currentSelection}
          onPick={handlePickOption}
        />

        {!isExactMatch && isComplete && (
          <ClosestMatchNotice
            brandName={brandName}
            productName={product.name}
            summary={attributeSummary}
            whatsappMessage={whatsappMessage}
          />
        )}
      </div>

      <div className="shrink-0 space-y-3">
        {isComplete ? (
          <PurchaseSummary
            isInStock={inStock}
            stockQuantity={stockQuantity}
            remainingStock={remainingStock}
            priceRupees={selected.priceRupees}
            quantity={orderQuantity}
            maxQuantity={maxSelectableQuantity}
            onQuantityChange={setAddQuantity}
            onAddToCart={handleAddToCart}
            hasJustBeenAdded={hasJustBeenAdded}
          />
        ) : (
          <SelectToSeePrice attributeLabels={missingAttributeLabels} />
        )}
      </div>

      {isComplete ? (
        <MobileStickyCta
          onAddToCart={handleAddToCart}
          hasJustBeenAdded={hasJustBeenAdded}
          priceRupees={selected.priceRupees}
          isInStock={inStock}
          stockQuantity={stockQuantity}
          remainingStock={remainingStock}
          quantity={orderQuantity}
          maxQuantity={maxSelectableQuantity}
          onQuantityChange={setAddQuantity}
          whatsappMessage={whatsappMessage}
        />
      ) : (
        <MobileStickyPlaceholder attributeLabels={missingAttributeLabels} />
      )}
    </div>
  );
}

const EMPTY_VARIANT: StorefrontVariant = {
  id: "",
  gradeSlug: "",
  priceRupees: 0,
  quantity: 0,
  warrantyDays: 0,
  images: [],
  attributes: {},
};

/* ─────────────────────── Configurator ─────────────────────── */

interface DimensionOption {
  /** Canonical key used by the matrix; for `string[]` we join with the multi-value sep. */
  key: string;
  label: string;
  /** Optional solid colour for swatch chips (storage/RAM rarely set it, colour usually does). */
  backgroundColor?: string;
  /** Grade-only — short condition blurb shown under the grade chip. */
  notes?: string;
}

interface Dimension {
  key: string;
  label: string;
  /** True when the dimension is `__grade`. Rendered as the hero row. */
  isGrade: boolean;
  options: DimensionOption[];
}

interface ConfiguratorProps {
  dimensions: Dimension[];
  variants: StorefrontVariant[];
  currentSelection: Record<string, string>;
  onPick: (dimensionKey: string, optionKey: string) => void;
}

function Configurator({
  dimensions,
  variants,
  currentSelection,
  onPick,
}: ConfiguratorProps) {
  if (dimensions.length === 0) {
    return null;
  }
  return (
    <section
      aria-label="Build your configuration"
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <header className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/55 px-2.5 py-2 md:px-3 md:py-2.5">
        <div className="flex items-center gap-1.5">
          <Settings2
            size={14}
            className="shrink-0 text-[var(--color-accent-700)]"
            aria-hidden
          />
          <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-ink-900)] md:text-sm">
            Build your configuration
          </h2>
        </div>
      </header>
      <div className="divide-y divide-[var(--color-ink-100)]">
        {dimensions.map((dimension, index) => (
          <DimensionRow
            key={dimension.key}
            dimension={dimension}
            variants={variants}
            currentSelection={currentSelection}
            onPick={onPick}
            isFirst={index === 0}
          />
        ))}
      </div>
    </section>
  );
}

interface DimensionRowProps {
  dimension: Dimension;
  variants: StorefrontVariant[];
  currentSelection: Record<string, string>;
  onPick: (dimensionKey: string, optionKey: string) => void;
  isFirst?: boolean;
}

function DimensionRow({
  dimension,
  variants,
  currentSelection,
  onPick,
  isFirst = false,
}: DimensionRowProps) {
  return (
    <div
      className={classNames(
        "flex flex-col gap-1.5 px-2.5 pb-2 pt-0 md:px-3 md:pb-2.5 md:pt-0",
        isFirst && "pt-2 md:pt-2.5",
      )}
    >
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)] md:text-[10.5px]">
        {dimension.label}
      </span>

      <DimensionTabRow
        dimension={dimension}
        variants={variants}
        currentSelection={currentSelection}
        onPick={onPick}
        trackAvailability={!dimension.isGrade}
      />
    </div>
  );
}

interface DimensionTabRowProps extends DimensionRowProps {
  /** When true, options incompatible with the current pick are styled as unavailable. */
  trackAvailability: boolean;
}

function DimensionTabRow({
  dimension,
  variants,
  currentSelection,
  onPick,
  trackAvailability,
}: DimensionTabRowProps) {
  return (
    <div
      className="flex w-full divide-x divide-[var(--color-ink-200)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-200)]"
      role="tablist"
      aria-label={dimension.label}
    >
      {dimension.options.map((option) => {
        const isSelected = currentSelection[dimension.key] === option.key;
        const state = trackAvailability
          ? computeOptionState(
              dimension.key,
              option.key,
              variants,
              currentSelection,
            )
          : "available";
        const isUnavailable = state === "unavailable" && !isSelected;

        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            onClick={() => onPick(dimension.key, option.key)}
            aria-selected={isSelected}
            data-state={trackAvailability ? state : undefined}
            title={
              isUnavailable
                ? "Not stocked with current pick — auto-switches"
                : undefined
            }
            className={classNames(
              "flex flex-1 items-center justify-center whitespace-nowrap border-0 px-1.5 py-1.5 text-center text-[10px] font-medium leading-snug transition-all md:px-2 md:py-2 md:text-[11px]",
              isSelected &&
                "rounded-[var(--radius-sm)] bg-[var(--color-accent-50)] font-semibold text-[var(--color-accent-800)] shadow-[var(--shadow-sm)] ring-1 ring-inset ring-[var(--color-accent-500)]",
              !isSelected &&
                !isUnavailable &&
                "bg-[var(--color-surface)] text-[var(--color-ink-800)] hover:bg-[var(--color-accent-50)] hover:text-[var(--color-accent-800)]",
              isUnavailable &&
                "bg-[var(--color-canvas-deep)]/40 text-[var(--color-ink-400)] line-through decoration-[var(--color-ink-300)] decoration-1 opacity-50 hover:bg-[var(--color-canvas-deep)]/55 hover:text-[var(--color-ink-500)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────── Closest-match notice ─────────────────────── */

function ClosestMatchNotice({
  brandName,
  productName,
  summary,
  whatsappMessage,
}: {
  brandName: string;
  productName: string;
  summary: string;
  whatsappMessage: string;
}) {
  const { whatsappNumber } = useStoreSettings();
  return (
    <div
      role="status"
      className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] px-2.5 py-2 text-[11px] text-[var(--color-accent-800)] sm:flex-row sm:items-center sm:justify-between md:text-[12px]"
    >
      <div className="min-w-0">
        <p className="font-semibold leading-tight">Closest match shown</p>
        <p className="mt-0.5 leading-snug">
          We don&apos;t stock this exact combination right now — message us and
          we&apos;ll source it.
          <span className="sr-only">
            {brandName} {productName}
            {summary ? ` (${summary})` : ""}
          </span>
        </p>
      </div>
      <a
        href={buildWhatsAppLink(whatsappMessage, whatsappNumber)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-whatsapp)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-whatsapp-dark)] md:text-[12px]"
      >
        <MessageCircle size={12} className="fill-white" />
        Ask on WhatsApp
      </a>
    </div>
  );
}

/* ─────────────────────── Purchase summary (desktop) ─────────────────────── */

interface PurchaseSummaryProps {
  isInStock: boolean;
  stockQuantity: number;
  remainingStock: number;
  priceRupees: number;
  quantity: number;
  maxQuantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
  hasJustBeenAdded: boolean;
}

function PurchaseSummary({
  isInStock,
  stockQuantity,
  remainingStock,
  priceRupees,
  quantity,
  maxQuantity,
  onQuantityChange,
  onAddToCart,
  hasJustBeenAdded,
}: PurchaseSummaryProps) {
  const stockLabel = isInStock
    ? `${stockQuantity} in stock${
        remainingStock < stockQuantity
          ? ` · ${remainingStock} available to add`
          : ""
      }`
    : "Sold out";
  const showBuyAll = isInStock && maxQuantity > 1 && quantity < maxQuantity;

  return (
    <div className="hidden md:block">
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-2.5 shadow-[var(--shadow-sm)]">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
              {stockLabel}
            </p>
            {showBuyAll ? (
              <button
                type="button"
                onClick={() => onQuantityChange(maxQuantity)}
                className="text-[10px] font-semibold text-[var(--color-accent-700)] underline-offset-2 hover:text-[var(--color-accent-800)] hover:underline"
              >
                Buy all ({maxQuantity})
              </button>
            ) : null}
          </div>
          <p className="text-xl font-semibold leading-none tracking-tight text-[var(--color-ink-900)]">
            {formatPrice(priceRupees)}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {isInStock ? (
            <QuantityStepper
              quantity={quantity}
              max={maxQuantity}
              onChange={onQuantityChange}
              size="sm"
            />
          ) : null}
          <Button
            variant="primary"
            size="sm"
            leadingIcon={
              hasJustBeenAdded ? <Check size={14} /> : <ShoppingBag size={14} />
            }
            className="min-w-0 flex-1"
            disabled={!isInStock || maxQuantity <= 0}
            onClick={onAddToCart}
          >
            {!isInStock
              ? "Sold out"
              : maxQuantity <= 0
                ? "Max in cart"
                : hasJustBeenAdded
                  ? "Added to cart"
                  : "Add to cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Mobile sticky CTA ─────────────────────── */

interface MobileStickyCtaProps {
  priceRupees: number;
  isInStock: boolean;
  stockQuantity: number;
  remainingStock: number;
  quantity: number;
  maxQuantity: number;
  onQuantityChange: (quantity: number) => void;
  whatsappMessage: string;
  onAddToCart: () => void;
  hasJustBeenAdded: boolean;
}

function MobileStickyCta({
  priceRupees,
  isInStock,
  stockQuantity,
  remainingStock,
  quantity,
  maxQuantity,
  onQuantityChange,
  whatsappMessage,
  onAddToCart,
  hasJustBeenAdded,
}: MobileStickyCtaProps) {
  const { whatsappNumber } = useStoreSettings();
  const showBuyAll = isInStock && maxQuantity > 1 && quantity < maxQuantity;

  return (
    <div
      className="fixed inset-x-0 z-30 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)]/95 px-2.5 pt-2 backdrop-blur md:hidden"
      style={{
        bottom: "calc(var(--mobile-tabbar-h) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "10px",
      }}
    >
      <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-[10px] font-medium text-[var(--color-ink-500)]">
            {isInStock ? (
              <>
                {stockQuantity} in stock
                {remainingStock < stockQuantity
                  ? ` · ${remainingStock} available`
                  : null}
              </>
            ) : (
              "Sold out"
            )}
          </p>
          {showBuyAll ? (
            <button
              type="button"
              onClick={() => onQuantityChange(maxQuantity)}
              className="shrink-0 text-[10px] font-semibold text-[var(--color-accent-700)] underline-offset-2 hover:text-[var(--color-accent-800)] hover:underline"
            >
              Buy all ({maxQuantity})
            </button>
          ) : null}
        </div>
        <p className="text-[15px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)]">
          {formatPrice(priceRupees)}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {isInStock ? (
          <>
            <QuantityStepper
              quantity={quantity}
              max={maxQuantity}
              onChange={onQuantityChange}
              size="sm"
            />
            <a
              href={buildWhatsAppLink(whatsappMessage, whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Inquire on WhatsApp"
              className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-full)] bg-[var(--color-whatsapp)] text-white shadow-[var(--shadow-sm)] active:bg-[var(--color-whatsapp-dark)]"
            >
              <MessageCircle size={14} className="fill-white" />
            </a>
            <button
              type="button"
              onClick={onAddToCart}
              disabled={maxQuantity <= 0}
              aria-live="polite"
              className="inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-accent-500)] px-3 text-[12px] font-semibold text-[var(--color-ink-900)] active:bg-[var(--color-accent-600)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {hasJustBeenAdded ? <Check size={13} /> : <ShoppingBag size={13} />}
              {hasJustBeenAdded ? "Added" : "Add to cart"}
            </button>
          </>
        ) : (
          <span className="inline-flex h-8 flex-1 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-ink-100)] px-3 text-[12px] font-semibold text-[var(--color-ink-500)]">
            Sold out
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Incomplete-selection placeholders ─────────────────────── */

function formatMissingPrompt(attributeLabels: string[]): string {
  if (attributeLabels.length === 0) {
    return "Select options to see price";
  }
  if (attributeLabels.length === 1) {
    return `Select ${attributeLabels[0]} to see price`;
  }
  if (attributeLabels.length === 2) {
    return `Select ${attributeLabels[0]} and ${attributeLabels[1]} to see price`;
  }
  const head = attributeLabels.slice(0, -1).join(", ");
  const tail = attributeLabels[attributeLabels.length - 1];
  return `Select ${head}, and ${tail} to see price`;
}

function SelectToSeePrice({
  attributeLabels,
}: {
  attributeLabels: string[];
}) {
  return (
    <div className="hidden md:block">
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 p-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          {formatMissingPrompt(attributeLabels)}
        </p>
      </div>
    </div>
  );
}

function MobileStickyPlaceholder({
  attributeLabels,
}: {
  attributeLabels: string[];
}) {
  return (
    <div
      className="fixed inset-x-0 z-30 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)]/95 px-2.5 pt-2 backdrop-blur md:hidden"
      style={{
        bottom: "calc(var(--mobile-tabbar-h) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "10px",
      }}
    >
      <div className="flex h-8 items-center justify-center rounded-[var(--radius-full)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {formatMissingPrompt(attributeLabels)}
      </div>
    </div>
  );
}

/* ─────────────────────── Selection / matching helpers ─────────────────────── */

function buildDimensions(
  product: Product,
  attributeDefinitions: AttributeDescriptor[],
  grades: GradeDescriptor[],
): Dimension[] {
  const dimensions: Dimension[] = [];

  // Grade dimension — always first when ≥ 2 grades exist on this product.
  const gradeOptions = collectGradeOptions(product.variants, grades);
  if (gradeOptions.length > 0) {
    dimensions.push({
      key: GRADE_DIMENSION_KEY,
      label: "Grade",
      isGrade: true,
      options: gradeOptions,
    });
  }

  for (const attribute of attributeDefinitions) {
    const options = collectAttributeOptions(product.variants, attribute);
    if (options.length === 0) {
      continue;
    }
    dimensions.push({
      key: attribute.slug,
      label: attribute.label,
      isGrade: false,
      options,
    });
  }

  return dimensions;
}

function collectGradeOptions(
  variants: StorefrontVariant[],
  grades: GradeDescriptor[],
): DimensionOption[] {
  const usedSlugs = new Set<string>();
  for (const variant of variants) {
    if (variant.gradeSlug) usedSlugs.add(variant.gradeSlug);
  }
  if (usedSlugs.size === 0) {
    return [];
  }
  const gradeBySlug = new Map(grades.map((row) => [row.slug, row] as const));
  const ordered: DimensionOption[] = [];
  // Preserve admin grade order when a descriptor exists; fall back to slug.
  for (const grade of grades) {
    if (!usedSlugs.has(grade.slug)) continue;
    ordered.push({
      key: grade.slug,
      label: grade.label,
      backgroundColor: grade.color,
      notes: grade.notes,
    });
  }
  for (const slug of usedSlugs) {
    if (gradeBySlug.has(slug)) continue;
    ordered.push({ key: slug, label: slug });
  }
  return ordered;
}

function collectAttributeOptions(
  variants: StorefrontVariant[],
  attribute: AttributeDescriptor,
): DimensionOption[] {
  const seen = new Map<string, DimensionOption>();
  const source = toAttributeLabelSource(attribute);

  for (const variant of variants) {
    for (const value of attributeValuesOnVariant(variant, attribute.slug)) {
      if (seen.has(value)) {
        continue;
      }
      const optionDescriptor = attribute.options.find((row) => row.value === value);
      seen.set(value, {
        key: value,
        label: resolveVariantAttributeLabel(
          source,
          value,
          variant.attributeDisplay,
        ),
        backgroundColor: optionDescriptor?.backgroundColor,
      });
    }
  }
  return Array.from(seen.values());
}

type OptionStateValue = "selected" | "available" | "unavailable";

function computeOptionState(
  dimensionKey: string,
  optionKey: string,
  variants: StorefrontVariant[],
  currentSelection: Record<string, string>,
): OptionStateValue {
  if (currentSelection[dimensionKey] === optionKey) {
    return "selected";
  }
  const probe = { ...currentSelection, [dimensionKey]: optionKey };
  const exact = findVariantBySelection(variants, probe);
  if (exact) return "available";
  // If the option exists on any variant ignoring everything but itself, it's
  // technically pickable — we just flag it as unavailable in the current combo.
  return "unavailable";
}

function describeSelection(
  variant: StorefrontVariant,
  attributes: AttributeDescriptor[],
): string {
  const parts: string[] = [];
  for (const attribute of attributes) {
    const raw = variant.attributes?.[attribute.slug];
    if (!raw) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    const source = toAttributeLabelSource(attribute);
    const labels = values
      .map((value) =>
        resolveVariantAttributeLabel(source, value, variant.attributeDisplay),
      )
      .filter((label) => label.length > 0);
    if (labels.length > 0) {
      parts.push(labels.join(" · "));
    }
  }
  return parts.join(" · ");
}
