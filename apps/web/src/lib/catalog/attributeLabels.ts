import {
  compareAlphabetically,
  resolveVariantAttributeLabel,
  type AttributeLabelSource,
} from "@store/shared";
import type { AttributeDescriptor } from "@store/shared";

export function toAttributeLabelSource(
  attribute: AttributeDescriptor,
): AttributeLabelSource {
  return {
    slug: attribute.slug,
    label: attribute.label,
    unit: attribute.unit,
    options: attribute.options,
  };
}

export function resolveLabelsForVariant(
  variantAttributes: Record<string, string | string[]>,
  definitions: AttributeDescriptor[],
  attributeDisplay?: Record<string, string>,
): Map<string, string> {
  const bySlug = new Map(definitions.map((row) => [row.slug, row]));
  const labels = new Map<string, string>();
  for (const [slug, raw] of Object.entries(variantAttributes)) {
    const values = Array.isArray(raw)
      ? raw.filter((entry) => entry.length > 0)
      : raw
        ? [raw]
        : [];
    if (values.length === 0) {
      continue;
    }
    const definition = bySlug.get(slug);
    if (!definition) {
      labels.set(slug, values.join(" / "));
      continue;
    }
    const source = toAttributeLabelSource(definition);
    labels.set(
      slug,
      values
        .map((value) =>
          resolveVariantAttributeLabel(source, value, attributeDisplay),
        )
        .join(" / "),
    );
  }
  return labels;
}

/** Attribute slugs present on a variant, ordered by admin label. */
export function orderedAttributeSlugsOnVariant(
  variantAttributes: Record<string, string | string[]>,
  definitions: AttributeDescriptor[],
): string[] {
  const slugs = Object.keys(variantAttributes).filter((slug) => {
    const raw = variantAttributes[slug];
    if (Array.isArray(raw)) {
      return raw.some((entry) => entry.length > 0);
    }
    return Boolean(raw);
  });
  const labelBySlug = new Map(
    definitions.map((row) => [row.slug, row.label] as const),
  );
  return slugs.sort((left, right) =>
    compareAlphabetically(
      labelBySlug.get(left) ?? left,
      labelBySlug.get(right) ?? right,
    ),
  );
}
