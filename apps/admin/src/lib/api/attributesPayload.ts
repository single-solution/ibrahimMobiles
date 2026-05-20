/**
 * Shared option-array parser used by `POST /api/attributes` +
 * `PUT /api/attributes/[id]`. Keeps the create/update paths honest about
 * the option shape (`{ value, label }`) and the per-attribute option
 * count cap.
 */

import { slugify } from "@store/shared";

import { ATTRIBUTE_FIELD_LIMITS } from "./fieldLimits";

export interface ParsedAttributeOption {
  value: string;
  label: string;
}

export type ParseAttributeOptionsResult =
  | { options: ParsedAttributeOption[] }
  | { error: string };

export function parseAttributeOptions(input: unknown): ParseAttributeOptionsResult {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: "Attribute must have at least one option." };
  }
  if (input.length > ATTRIBUTE_FIELD_LIMITS.optionCount) {
    return {
      error: `An attribute can have at most ${ATTRIBUTE_FIELD_LIMITS.optionCount} options.`,
    };
  }
  const seenValues = new Set<string>();
  const out: ParsedAttributeOption[] = [];
  for (const raw of input) {
    if (raw === null || typeof raw !== "object") {
      return { error: "Each option must be an object with value + label." };
    }
    const candidate = raw as { value?: unknown; label?: unknown };
    const labelStr =
      typeof candidate.label === "string" ? candidate.label.trim() : "";
    if (labelStr.length === 0 || labelStr.length > ATTRIBUTE_FIELD_LIMITS.optionLabel) {
      return {
        error: `Option label must be 1–${ATTRIBUTE_FIELD_LIMITS.optionLabel} characters.`,
      };
    }
    const valueRaw =
      typeof candidate.value === "string" && candidate.value.trim().length > 0
        ? candidate.value.trim()
        : labelStr;
    const value = slugify(valueRaw, ATTRIBUTE_FIELD_LIMITS.optionValue);
    if (value.length === 0) {
      return { error: "Option value could not be derived." };
    }
    if (seenValues.has(value)) {
      return { error: `Duplicate option value "${value}".` };
    }
    seenValues.add(value);
    out.push({ value, label: labelStr });
  }
  return { options: out };
}
