import { FIELD_LIMITS } from "@store/shared";
import { CONDITION_GRADES, CONNECTOR_TYPES } from "@store/db";

const ALLOWED_GRADES = new Set<string>(CONDITION_GRADES);
const ALLOWED_CONNECTORS = new Set<string>(CONNECTOR_TYPES);

/**
 * Hard upper bound on any rupee field. Even ultra-luxury phones top out
 * around Rs 1.2M; anything past 100M is definitionally an admin typo or
 * an attempted overflow attack.
 */
const MAX_RUPEE_AMOUNT = 100_000_000;
/** Default warranty months for variants where the admin didn't specify. */
const DEFAULT_WARRANTY_MONTHS = 6;
/** Hard upper bound on warranty months — we don't sell anything covered for
 *  more than 5 years, so bigger values are typos. */
const MAX_WARRANTY_MONTHS = 60;
/** Phone storage upper bound — covers every commercially-sold tier. */
const MAX_STORAGE_GB = 8_192;
/** RAM upper bound — covers desktops as well as phones in case we list them. */
const MAX_RAM_GB = 256;
/** Battery health values are integer percentages. */
const MIN_BATTERY_HEALTH_PERCENT = 0;
const MAX_BATTERY_HEALTH_PERCENT = 100;

export interface VariantInput {
  grade?: unknown;
  colorName?: unknown;
  priceRupees?: unknown;
  originalPriceRupees?: unknown;
  isInStock?: unknown;
  warrantyMonths?: unknown;
  notes?: unknown;
  storageGb?: unknown;
  ramGb?: unknown;
  batteryHealthMinPercent?: unknown;
  batteryHealthMaxPercent?: unknown;
  isPtaApproved?: unknown;
  connector?: unknown;
  wattage?: unknown;
  lengthMeters?: unknown;
  isGenuine?: unknown;
}

type VariantValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Coerce + validate a variant payload. Accepts partial input — caller decides
 * which fields are required by checking presence on the returned object.
 *
 * Returns a Mongo-safe document patch suitable for direct $push or $set.
 */
export function validateVariant(input: VariantInput, requireAll: boolean): VariantValidationResult {
  const value: Record<string, unknown> = {};

  if (input.grade !== undefined || requireAll) {
    if (typeof input.grade !== "string" || !ALLOWED_GRADES.has(input.grade)) {
      return { ok: false, error: `Grade must be one of: ${CONDITION_GRADES.join(", ")}` };
    }
    value.grade = input.grade;
  }

  if (input.colorName !== undefined || requireAll) {
    if (typeof input.colorName !== "string" || input.colorName.trim().length === 0) {
      return { ok: false, error: "Color name is required." };
    }
    value.colorName = input.colorName.trim().slice(0, FIELD_LIMITS.shortLabel);
  }

  if (input.priceRupees !== undefined || requireAll) {
    const price = Number(input.priceRupees);
    if (!Number.isFinite(price) || price < 0 || price > MAX_RUPEE_AMOUNT) {
      return { ok: false, error: "Price must be a non-negative number." };
    }
    value.priceRupees = price;
  }

  if (input.originalPriceRupees !== undefined || requireAll) {
    const original = Number(input.originalPriceRupees);
    if (!Number.isFinite(original) || original < 0 || original > MAX_RUPEE_AMOUNT) {
      return { ok: false, error: "Original price must be a non-negative number." };
    }
    value.originalPriceRupees = original;
  }

  if (input.isInStock !== undefined) {
    value.isInStock = Boolean(input.isInStock);
  } else if (requireAll) {
    value.isInStock = true;
  }

  if (input.warrantyMonths !== undefined || requireAll) {
    const months = Number(input.warrantyMonths ?? DEFAULT_WARRANTY_MONTHS);
    if (!Number.isFinite(months) || months < 0 || months > MAX_WARRANTY_MONTHS) {
      return { ok: false, error: `Warranty months must be 0–${MAX_WARRANTY_MONTHS}.` };
    }
    value.warrantyMonths = months;
  }

  if (typeof input.notes === "string") {
    value.notes = input.notes.trim().slice(0, FIELD_LIMITS.operatorNote);
  }

  if (input.storageGb !== undefined) {
    const storage = Number(input.storageGb);
    if (!Number.isFinite(storage) || storage < 1 || storage > MAX_STORAGE_GB) {
      return { ok: false, error: "Storage must be a positive number of GB." };
    }
    value.storageGb = storage;
  }
  if (input.ramGb !== undefined) {
    const ram = Number(input.ramGb);
    if (!Number.isFinite(ram) || ram < 0 || ram > MAX_RAM_GB) {
      return { ok: false, error: `RAM must be 0–${MAX_RAM_GB} GB.` };
    }
    value.ramGb = ram;
  }
  if (input.batteryHealthMinPercent !== undefined) {
    const min = Number(input.batteryHealthMinPercent);
    if (!Number.isFinite(min) || min < MIN_BATTERY_HEALTH_PERCENT || min > MAX_BATTERY_HEALTH_PERCENT) {
      return { ok: false, error: `Battery health min must be ${MIN_BATTERY_HEALTH_PERCENT}–${MAX_BATTERY_HEALTH_PERCENT}.` };
    }
    value.batteryHealthMinPercent = min;
  }
  if (input.batteryHealthMaxPercent !== undefined) {
    const max = Number(input.batteryHealthMaxPercent);
    if (!Number.isFinite(max) || max < MIN_BATTERY_HEALTH_PERCENT || max > MAX_BATTERY_HEALTH_PERCENT) {
      return { ok: false, error: `Battery health max must be ${MIN_BATTERY_HEALTH_PERCENT}–${MAX_BATTERY_HEALTH_PERCENT}.` };
    }
    value.batteryHealthMaxPercent = max;
  }
  if (input.isPtaApproved !== undefined) {
    value.isPtaApproved = Boolean(input.isPtaApproved);
  }

  // Cross-field invariants. Done last so we can compare numbers we've already
  // coerced and bounded above.
  if (
    typeof value.batteryHealthMinPercent === "number" &&
    typeof value.batteryHealthMaxPercent === "number" &&
    value.batteryHealthMinPercent > value.batteryHealthMaxPercent
  ) {
    return {
      ok: false,
      error: "Battery health min must be less than or equal to max.",
    };
  }
  if (
    typeof value.priceRupees === "number" &&
    typeof value.originalPriceRupees === "number" &&
    value.originalPriceRupees > 0 &&
    value.priceRupees > value.originalPriceRupees
  ) {
    return {
      ok: false,
      error: "Price cannot be higher than the original price.",
    };
  }

  if (typeof input.connector === "string" && ALLOWED_CONNECTORS.has(input.connector)) {
    value.connector = input.connector;
  }
  if (input.wattage !== undefined) {
    const wattage = Number(input.wattage);
    if (Number.isFinite(wattage) && wattage >= 0) {
      value.wattage = wattage;
    }
  }
  if (input.lengthMeters !== undefined) {
    const length = Number(input.lengthMeters);
    if (Number.isFinite(length) && length >= 0) {
      value.lengthMeters = length;
    }
  }
  if (input.isGenuine !== undefined) {
    value.isGenuine = Boolean(input.isGenuine);
  }

  return { ok: true, value };
}
