"use client";

import {
  resolveVariantAttributeLabel,
  type Product,
  type StoredImage,
} from "@store/shared";

import { toAttributeLabelSource } from "@/lib/catalog/attributeLabels";
import { useAttributesForCategory } from "@/lib/storefront/storefrontReferenceContext";

export interface AttributeChipModel {
  key: string;
  label: string;
  backgroundColor?: string;
}

export interface AttributeChipGroup {
  attributeSlug: string;
  chips: AttributeChipModel[];
}

export interface ProductCardMediaSlide {
  slideKey: string;
  heroImage?: StoredImage;
  titleChipGroups: AttributeChipGroup[];
  overlayChipGroups: AttributeChipGroup[];
  /** Product view — badge follows the active grade slide. */
  gradeSlug?: string;
}

/** Reserved chip row height — matches skeleton and empty cards. */
export const CARD_CHIP_SLOT_CLASS = "min-h-[2.25rem] content-start pt-0.5";
/** Footer band — same min-height for grid alignment; content is
 *  centered vertically so equal top/bottom padding reads symmetric
 *  even when chips don't fill the slot. */
export const CARD_FOOTER_CHIP_SLOT_CLASS =
  "flex min-h-[2.25rem] items-center";
export const TITLE_CHIP_ROW_MAX_PX = 36;
export const OVERLAY_CHIP_ROW_MAX_PX = 20;

export interface ChipRowLayout {
  segmentCount: number;
  visibleCounts: number[];
}

export function getAttributeChipGroups(
  product: Product,
  attributes: ReturnType<typeof useAttributesForCategory>,
  cardPosition: "image-overlay" | "title-chips",
): AttributeChipGroup[] {
  const groups: AttributeChipGroup[] = [];
  const positioned = attributes.filter(
    (attribute) => attribute.cardPosition === cardPosition,
  );

  for (const attribute of positioned) {
    const valueMeta = new Map<
      string,
      { label: string; backgroundColor?: string }
    >();

    for (const variant of product.variants) {
      const raw = variant.attributes[attribute.slug];
      if (!raw) {
        continue;
      }
      const optionValues = Array.isArray(raw) ? raw : [raw];
      const display = variant.attributeDisplay ?? {};
      const source = toAttributeLabelSource(attribute);

      for (const value of optionValues) {
        if (valueMeta.has(value)) {
          continue;
        }
        valueMeta.set(value, {
          label: resolveVariantAttributeLabel(source, value, display),
          backgroundColor: attribute.options.find(
            (candidate) => candidate.value === value,
          )?.backgroundColor,
        });
      }
    }

    if (valueMeta.size === 0) {
      continue;
    }

    const chips: AttributeChipModel[] = [];
    const knownValues = new Set<string>();
    for (const option of attribute.options) {
      const meta = valueMeta.get(option.value);
      if (!meta) {
        continue;
      }
      knownValues.add(option.value);
      chips.push({
        key: `${attribute.slug}:${option.value}`,
        label: meta.label,
        backgroundColor: meta.backgroundColor,
      });
    }

    for (const [value, meta] of valueMeta) {
      if (knownValues.has(value)) {
        continue;
      }
      chips.push({
        key: `${attribute.slug}:${value}`,
        label: meta.label,
        backgroundColor: meta.backgroundColor,
      });
    }

    if (chips.length > 0) {
      groups.push({ attributeSlug: attribute.slug, chips });
    }
  }

  return groups;
}

export function flattenChipGroups(groups: AttributeChipGroup[]): AttributeChipModel[] {
  return groups.flatMap((group) => group.chips);
}
