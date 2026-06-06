"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "@store/shared";

import {
  findVariantBySelection,
  hasPdpConfigurationInSearch,
  parsePdpSelectionFromSearch,
  resolvePickerSelection,
  selectionFromVariant,
  selectionSignature,
  selectionToUrlPatch,
} from "@/lib/catalog/pdpSelection";
import { useAttributesForCategory } from "@/lib/core/storefrontReferenceContext";
import { usePdpUrlParams } from "@/lib/core/usePdpUrlParams";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";

import { EMPTY_VARIANT } from "./variantSelectorDimensions";

interface VariantContextValue {
  selectedVariantId: string;
  setSelectedVariantId: (id: string) => void;
  currentSelection: Record<string, string>;
  pick: (dimensionKey: string, optionKey: string) => void;
}

const VariantContext = createContext<VariantContextValue | null>(null);

interface VariantProviderProps {
  product: Product;
  initialVariantId: string;
  children: ReactNode;
}

function hasSelectionValues(selection: Record<string, string>): boolean {
  return Object.values(selection).some((value) => Boolean(value));
}

/**
 * Single source of truth for PDP variant selection.
 *
 * The PDP mounts two responsive `<VariantSelector>` layouts (mobile +
 * desktop) under one provider; CSS shows one per viewport but both stay
 * mounted. Holding the selection state, URL sync, and pick handler here —
 * rather than inside each selector — means the hidden layout can no longer
 * clobber the visible one's variant (the bug where the mobile price only
 * updated on refresh). Consumers derive their own price/stock from their
 * live-commerce product copy using the shared `selectedVariantId`.
 */
export function VariantProvider({
  product,
  initialVariantId,
  children,
}: VariantProviderProps) {
  const { searchParams, replace } = usePdpUrlParams();
  const categoryAttributes = useAttributesForCategory(product.categorySlug);
  const attributeSlugs = useMemo(
    () => categoryAttributes.map((row) => row.slug),
    [categoryAttributes],
  );

  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);

  const selected =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants[0] ??
    EMPTY_VARIANT;

  /** Shopper's chip picks — owned here. Updated only by explicit code paths
   *  (chip click, URL hydration) so multi-value picks survive. */
  const [pickerSelection, setPickerSelection] = useState(() =>
    selectionFromVariant(selected),
  );

  const pendingSelectionSigRef = useRef<string | null>(null);

  const syncSelectionToUrl = useCallback(
    (selection: Record<string, string>) => {
      if (!hasSelectionValues(selection)) {
        return;
      }
      pendingSelectionSigRef.current = selectionSignature(selection);
      replace(selectionToUrlPatch(selection, attributeSlugs));
    },
    [attributeSlugs, replace],
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
    // current variant and drop the bad params. No reload, no banner — just a
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

  const pick = useCallback(
    (dimensionKey: string, optionKey: string) => {
      const proposed = { ...pickerSelection, [dimensionKey]: optionKey };
      const { variant, selection } = resolvePickerSelection(
        product.variants,
        proposed,
        dimensionKey,
      );
      pendingSelectionSigRef.current = selectionSignature(selection);
      setPickerSelection(selection);
      syncSelectionToUrl(selection);
      setSelectedVariantId(variant.id);
    },
    [pickerSelection, product.variants, syncSelectionToUrl],
  );

  const value = useMemo(
    () => ({
      selectedVariantId,
      setSelectedVariantId,
      currentSelection: pickerSelection,
      pick,
    }),
    [selectedVariantId, pickerSelection, pick],
  );

  return (
    <VariantContext.Provider value={value}>{children}</VariantContext.Provider>
  );
}

export function useSelectedVariantId(): string {
  const context = useContext(VariantContext);
  if (!context) {
    throw new Error("useSelectedVariantId must be used within a VariantProvider");
  }
  return context.selectedVariantId;
}

export function useVariantSelection(): VariantContextValue {
  const context = useContext(VariantContext);
  if (!context) {
    throw new Error("useVariantSelection must be used within a VariantProvider");
  }
  return context;
}
