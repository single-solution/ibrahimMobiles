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
import { useToast } from "@/components/ui/Toast";
import { useVariantSelection } from "@/components/shared/VariantContext";

import {
  attributeValuesOnVariant,
  findVariantBySelection,
  getRequiredAttributeSlugsForProduct,
  hasPdpConfigurationInSearch,
  isPdpSelectionComplete,
  parsePdpSelectionFromSearch,
  resolvePickerSelection,
  selectionFromVariant,
  selectionSignature,
  selectionToUrlPatch,
} from "@/lib/catalog/pdpSelection";
import { useCart } from "@/lib/cart/useCart";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { usePdpUrlParams } from "@/lib/storefront/usePdpUrlParams";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";
import {
  useAttributesForCategory,
  useGradesForCategory,
} from "@/lib/storefront/storefrontReferenceContext";

import { Configurator, ClosestMatchNotice } from "./variantSelectorConfigurator";
import {
  buildDimensions,
  describeSelection,
  EMPTY_VARIANT,
} from "./variantSelectorDimensions";
import {
  MobileStickyCta,
  MobileStickyPlaceholder,
  PurchaseSummary,
  SelectToSeePrice,
} from "./variantSelectorPurchase";

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
  const { selectedVariantId, setSelectedVariantId } = useVariantSelection();
  const { searchParams, replace } = usePdpUrlParams();
  const cart = useCart();
  const { toast } = useToast();
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
      scheduleStateUpdate(() => {
        setPickerSelection(fallbackSelection);
        setSelectedVariantId(currentVariant.id);
      });
      syncSelectionToUrl(fallbackSelection);
      return;
    }

    scheduleStateUpdate(() => {
      setPickerSelection(fromUrl);
      setSelectedVariantId(exact.id);
    });
  }, [
    searchParams,
    attributeSlugs,
    product,
    selectedVariantId,
    setSelectedVariantId,
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
  const heroImage = product.images?.[0];

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
    toast(`${product.name} added to cart`);
  };

  return (
    <div className="space-y-3 md:flex md:h-full md:min-h-0 md:flex-col md:space-y-0">
      {/* Title + configurator stay grouped at the top of the column. Any
          leftover vertical space inside the right-hand column shows up as a
          gap between this group and the price block below it, so the price
          stays pinned to the bottom of the gallery's height without the
          configurator floating in the middle. */}
      <div className="space-y-3 md:flex md:min-h-0 md:flex-col md:gap-3 md:space-y-0">
        <header className="shrink-0 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-accent-50)]/40 px-3 py-2.5 shadow-[var(--shadow-sm)] md:px-4 md:py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)] md:text-[11px]">
            {brandName}
          </p>
          <h1 className="mt-0.5 text-lg font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] sm:text-xl md:mt-1 md:text-4xl md:leading-[1.08] md:tracking-[-0.02em]">
            {product.name}
          </h1>
        </header>

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

      <div className="shrink-0 space-y-3 md:mt-auto md:pt-3">
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
