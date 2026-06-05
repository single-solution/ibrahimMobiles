/**
 * Attribute visibility rules and helpers for cascading filters / variant UI.
 */

import { compareAlphabetically } from "./attributeOption";

export type AttributeVisibilityType = "always" | "brand" | "grade" | "attribute";

export interface AttributeVisibility {
  type: AttributeVisibilityType;
  brandSlugs?: string[];
  gradeSlugs?: string[];
  attributeSlug?: string;
  optionValues?: string[];
}

export const ATTRIBUTE_VISIBILITY_ALWAYS: AttributeVisibility = { type: "always" };

export interface VisibilityContext {
  brandSlug?: string;
  brandSlugs?: string[];
  gradeSlug?: string;
  gradeSlugs?: string[];
  /** Selected attribute values (filter URL or variant row). */
  attributes?: Record<string, string>;
}

export interface AttributeVisibilityNode {
  slug: string;
  label: string;
  visibility: AttributeVisibility;
}

function normalizeSlugs(values: string[] | undefined): string[] {
  if (!values?.length) {
    return [];
  }
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function firstAttributeValue(
  attributes: Record<string, string> | undefined,
  slug: string,
): string | undefined {
  const raw = attributes?.[slug]?.trim();
  return raw === "" ? undefined : raw;
}

/** Whether an attribute row should render for the given context. */
export function isVisibilitySatisfied(
  visibility: AttributeVisibility | undefined,
  context: VisibilityContext,
): boolean {
  const rule = visibility ?? ATTRIBUTE_VISIBILITY_ALWAYS;

  switch (rule.type) {
    case "always":
      return true;
    case "brand": {
      const allowed = normalizeSlugs(rule.brandSlugs);
      if (allowed.length === 0) {
        return false;
      }
      if (context.brandSlug && allowed.includes(context.brandSlug.trim().toLowerCase())) {
        return true;
      }
      const selected = normalizeSlugs(context.brandSlugs);
      return selected.some((slug) => allowed.includes(slug));
    }
    case "grade": {
      const allowed = normalizeSlugs(rule.gradeSlugs);
      if (allowed.length === 0) {
        return false;
      }
      if (context.gradeSlug && allowed.includes(context.gradeSlug.trim().toLowerCase())) {
        return true;
      }
      const selected = normalizeSlugs(context.gradeSlugs);
      return selected.some((slug) => allowed.includes(slug));
    }
    case "attribute": {
      const parentSlug = rule.attributeSlug?.trim().toLowerCase();
      const allowedValues = normalizeSlugs(rule.optionValues);
      if (!parentSlug || allowedValues.length === 0) {
        return false;
      }
      const selected = firstAttributeValue(context.attributes, parentSlug)?.toLowerCase();
      return Boolean(selected && allowedValues.includes(selected));
    }
    default:
      return true;
  }
}

/** Topological order: parents before children; ties broken alphabetically by label. */
export function sortAttributesByVisibility<T extends AttributeVisibilityNode>(
  attributes: T[],
): T[] {
  const bySlug = new Map(attributes.map((attr) => [attr.slug, attr]));
  const depthCache = new Map<string, number>();

  function depth(slug: string, visiting = new Set<string>()): number {
    if (depthCache.has(slug)) {
      return depthCache.get(slug) ?? 0;
    }
    if (visiting.has(slug)) {
      return 0;
    }
    visiting.add(slug);
    const attr = bySlug.get(slug);
    const vis = attr?.visibility ?? ATTRIBUTE_VISIBILITY_ALWAYS;
    
    if (vis.type !== "attribute" || !vis.attributeSlug) {
      visiting.delete(slug);
      depthCache.set(slug, 0);
      return 0;
    }
    
    const parent = vis.attributeSlug.trim().toLowerCase();
    const parentDepth = bySlug.has(parent) ? depth(parent, visiting) + 1 : 0;
    
    visiting.delete(slug);
    depthCache.set(slug, parentDepth);
    return parentDepth;
  }

  return [...attributes].sort((left, right) => {
    const depthDiff = depth(left.slug) - depth(right.slug);
    if (depthDiff !== 0) {
      return depthDiff;
    }
    return compareAlphabetically(left.label, right.label);
  });
}

/** Attribute slugs that depend on `rootSlug` (directly or transitively). */
export function collectDependentAttributeSlugs(
  attributes: AttributeVisibilityNode[],
  rootSlug: string,
): string[] {
  const normalizedRoot = rootSlug.trim().toLowerCase();
  const dependents = new Set<string>();

  function walk(parent: string) {
    for (const attr of attributes) {
      const vis = attr.visibility ?? ATTRIBUTE_VISIBILITY_ALWAYS;
      if (vis.type !== "attribute" || !vis.attributeSlug) {
        continue;
      }
      if (vis.attributeSlug.trim().toLowerCase() !== parent) {
        continue;
      }
      if (!dependents.has(attr.slug)) {
        dependents.add(attr.slug);
        walk(attr.slug);
      }
    }
  }

  walk(normalizedRoot);
  return [...dependents];
}

/** Slugs to remove from URL when a parent filter value changes or clears. */
export function attributeSlugsToClearOnFilterChange(
  attributes: AttributeVisibilityNode[],
  changedSlug: "brand" | "grade" | string,
): string[] {
  if (changedSlug === "brand" || changedSlug === "grade") {
    return attributes
      .filter((attr) => {
        const vis = attr.visibility ?? ATTRIBUTE_VISIBILITY_ALWAYS;
        return vis.type !== "always";
      })
      .map((attr) => attr.slug);
  }
  return collectDependentAttributeSlugs(attributes, changedSlug);
}

export function parseAttributeVisibility(value: unknown): AttributeVisibility {
  if (!value || typeof value !== "object") {
    return ATTRIBUTE_VISIBILITY_ALWAYS;
  }
  const candidate = value as Record<string, unknown>;
  const type = candidate.type;
  if (type === "brand" && Array.isArray(candidate.brandSlugs)) {
    return {
      type: "brand",
      brandSlugs: candidate.brandSlugs
        .filter((str): str is string => typeof str === "string")
        .map((str) => str.trim())
        .filter(Boolean),
    };
  }
  if (type === "grade" && Array.isArray(candidate.gradeSlugs)) {
    return {
      type: "grade",
      gradeSlugs: candidate.gradeSlugs
        .filter((str): str is string => typeof str === "string")
        .map((str) => str.trim())
        .filter(Boolean),
    };
  }
  if (
    type === "attribute" &&
    typeof candidate.attributeSlug === "string" &&
    Array.isArray(candidate.optionValues)
  ) {
    return {
      type: "attribute",
      attributeSlug: candidate.attributeSlug.trim(),
      optionValues: candidate.optionValues
        .filter((str): str is string => typeof str === "string")
        .map((str) => str.trim())
        .filter(Boolean),
    };
  }
  return ATTRIBUTE_VISIBILITY_ALWAYS;
}
