/**
 * URL search-param ↔ `StorefrontProductFilters` adapter.
 *
 * Lives in its own module so the shop list page (server) and the filter
 * sidebar (client) both read/write the exact same param keys without one
 * accidentally drifting from the other. The keys are short on purpose so
 * shareable URLs stay clean.
 */

import type {
  StorefrontProductFilters,
  StorefrontSort,
} from "@/lib/storefront/queries";
import { DECIMAL_RADIX, type ProductCategory } from "@store/shared";

const SEARCH_QUERY_MAX_CHARS = 100;

// Inlined enum literals — pulling them from `@store/db` would drag the
// Mongoose runtime into client bundles. Keep these in sync with the model
// schemas (see `packages/db/src/models/Category.ts` and
// `packages/db/src/models/Product.ts`).
const CONDITION_GRADES = [
  "brand-new",
  "genuine",
  "box-open",
  "refurbished",
  "china-water",
  "lcd-shaded",
] as const;
type ConditionGrade = (typeof CONDITION_GRADES)[number];

const ACCESSORY_TYPES = [
  "charger",
  "cable",
  "case",
  "earbuds",
  "screen-protector",
  "power-bank",
  "other",
] as const;
type AccessoryType = (typeof ACCESSORY_TYPES)[number];

const CONNECTOR_TYPES = [
  "usb-c",
  "lightning",
  "micro-usb",
  "wireless",
  "n-a",
] as const;
type ConnectorType = (typeof CONNECTOR_TYPES)[number];

/** Public URL keys. Keep these short and stable — they're shareable links. */
export const FILTER_PARAM_KEYS = {
  brands: "brand",
  grades: "grade",
  minPrice: "min",
  maxPrice: "max",
  storage: "storage",
  ram: "ram",
  battery: "battery",
  pta: "pta",
  accessoryTypes: "type",
  connectors: "conn",
  wattages: "watt",
  gadgetTypes: "gtype",
  inStock: "stock",
  sort: "sort",
  page: "page",
  search: "q",
} as const;

const VALID_SORTS: readonly StorefrontSort[] = [
  "newest",
  "release",
  "price-asc",
  "price-desc",
  "name-asc",
];

const VALID_GRADES = new Set<string>(CONDITION_GRADES);
const VALID_ACCESSORY_TYPES = new Set<string>(ACCESSORY_TYPES);
const VALID_CONNECTORS = new Set<string>(CONNECTOR_TYPES);

/** Type predicates around the union enums above — using these in `.filter`
 *  lets TypeScript narrow the result without an explicit `as Foo[]` cast. */
const isConditionGrade = (value: string): value is ConditionGrade =>
  VALID_GRADES.has(value);
const isAccessoryType = (value: string): value is AccessoryType =>
  VALID_ACCESSORY_TYPES.has(value);
const isConnectorType = (value: string): value is ConnectorType =>
  VALID_CONNECTORS.has(value);
const isStorefrontSort = (value: string): value is StorefrontSort =>
  (VALID_SORTS as readonly string[]).includes(value);

/** Battery health is reported as a percentage; 100% is the upper bound. */
const MAX_BATTERY_HEALTH_PERCENT = 100;

/**
 * Read either a `URLSearchParams` instance or a server-provided
 * `Record<string, string | string[] | undefined>` in a uniform way. Returns
 * an array of values for the given key; comma-separated values are
 * exploded.
 */
function readMulti(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  let raw: string[] = [];
  if (source instanceof URLSearchParams) {
    raw = source.getAll(key);
  } else {
    const value = source[key];
    if (Array.isArray(value)) {
      raw = value;
    }
    else if (typeof value === "string") raw = [value];
  }
  const collected: string[] = [];
  for (const entry of raw) {
    for (const part of entry.split(",")) {
      const trimmed = part.trim();
      if (trimmed) {
        collected.push(trimmed);
      }
    }
  }
  return collected;
}

function readSingle(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? undefined;
  }
  const value = source[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function readPositiveInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, DECIMAL_RADIX);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Parse search params into a `StorefrontProductFilters`. Bad/unknown values
 * are dropped silently — the rule is "best effort, never 500".
 *
 * `category` is *not* read from query — it comes from the URL path segment
 * — so the caller is expected to set it explicitly.
 */
export function parseFiltersFromSearchParams(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
  defaults: { category?: ProductCategory } = {},
): StorefrontProductFilters {
  const filters: StorefrontProductFilters = {
    category: defaults.category,
  };

  const brandSlugs = readMulti(source, FILTER_PARAM_KEYS.brands);
  if (brandSlugs.length > 0) {
    filters.brandSlugs = brandSlugs;
  }

  const grades = readMulti(source, FILTER_PARAM_KEYS.grades).filter(isConditionGrade);
  if (grades.length > 0) {
    filters.grades = grades;
  }

  const minPrice = readPositiveInt(readSingle(source, FILTER_PARAM_KEYS.minPrice));
  const maxPrice = readPositiveInt(readSingle(source, FILTER_PARAM_KEYS.maxPrice));
  if (minPrice !== undefined) {
    filters.minPriceRupees = minPrice;
  }
  if (maxPrice !== undefined && maxPrice > 0) {
    filters.maxPriceRupees = maxPrice;
  }

  const storage = readMulti(source, FILTER_PARAM_KEYS.storage)
    .map((value) => Number.parseInt(value, DECIMAL_RADIX))
    .filter((parsed) => Number.isFinite(parsed) && parsed > 0);
  if (storage.length > 0) {
    filters.storageGb = storage;
  }

  const ram = readMulti(source, FILTER_PARAM_KEYS.ram)
    .map((value) => Number.parseInt(value, DECIMAL_RADIX))
    .filter((parsed) => Number.isFinite(parsed) && parsed > 0);
  if (ram.length > 0) {
    filters.ramGb = ram;
  }

  const battery = readPositiveInt(readSingle(source, FILTER_PARAM_KEYS.battery));
  if (battery !== undefined && battery > 0 && battery <= MAX_BATTERY_HEALTH_PERCENT) {
    filters.minBatteryHealthPercent = battery;
  }

  const pta = readSingle(source, FILTER_PARAM_KEYS.pta);
  if (pta === "1" || pta === "pta" || pta === "true") {
    filters.isPtaApproved = true;
  } else if (pta === "0" || pta === "non-pta" || pta === "false") {
    filters.isPtaApproved = false;
  }

  const accessoryTypes = readMulti(source, FILTER_PARAM_KEYS.accessoryTypes).filter(isAccessoryType);
  if (accessoryTypes.length > 0) {
    filters.accessoryTypes = accessoryTypes;
  }

  const connectors = readMulti(source, FILTER_PARAM_KEYS.connectors).filter(isConnectorType);
  if (connectors.length > 0) {
    filters.connectors = connectors;
  }

  const wattages = readMulti(source, FILTER_PARAM_KEYS.wattages)
    .map((value) => Number.parseInt(value, DECIMAL_RADIX))
    .filter((parsed) => Number.isFinite(parsed) && parsed > 0);
  if (wattages.length > 0) {
    filters.wattages = wattages;
  }

  const gadgetTypes = readMulti(source, FILTER_PARAM_KEYS.gadgetTypes);
  if (gadgetTypes.length > 0) {
    filters.gadgetTypes = gadgetTypes;
  }

  if (readSingle(source, FILTER_PARAM_KEYS.inStock) === "1") {
    filters.inStockOnly = true;
  }

  const sort = readSingle(source, FILTER_PARAM_KEYS.sort);
  if (sort && isStorefrontSort(sort)) {
    filters.sort = sort;
  }

  const page = readPositiveInt(readSingle(source, FILTER_PARAM_KEYS.page));
  if (page !== undefined && page > 0) {
    filters.page = page;
  }

  const search = readSingle(source, FILTER_PARAM_KEYS.search);
  if (search && search.trim().length > 0) {
    filters.search = search.trim().slice(0, SEARCH_QUERY_MAX_CHARS);
  }

  return filters;
}

/**
 * Convert a filters object to a `URLSearchParams` instance. Empty / default
 * values are omitted so the URL stays minimal.
 */
export function buildSearchParamsFromFilters(
  filters: Omit<StorefrontProductFilters, "category" | "categories">,
): URLSearchParams {
  const params = new URLSearchParams();
  const setMulti = (key: string, values?: readonly (string | number)[]) => {
    if (!values || values.length === 0) {
      return;
    }
    params.set(key, values.map(String).join(","));
  };

  setMulti(FILTER_PARAM_KEYS.brands, filters.brandSlugs);
  setMulti(FILTER_PARAM_KEYS.grades, filters.grades);
  if (typeof filters.minPriceRupees === "number" && filters.minPriceRupees > 0) {
    params.set(FILTER_PARAM_KEYS.minPrice, String(filters.minPriceRupees));
  }
  if (typeof filters.maxPriceRupees === "number" && filters.maxPriceRupees > 0) {
    params.set(FILTER_PARAM_KEYS.maxPrice, String(filters.maxPriceRupees));
  }
  setMulti(FILTER_PARAM_KEYS.storage, filters.storageGb);
  setMulti(FILTER_PARAM_KEYS.ram, filters.ramGb);
  if (typeof filters.minBatteryHealthPercent === "number") {
    params.set(FILTER_PARAM_KEYS.battery, String(filters.minBatteryHealthPercent));
  }
  if (filters.isPtaApproved === true) {
    params.set(FILTER_PARAM_KEYS.pta, "1");
  }
  if (filters.isPtaApproved === false) {
    params.set(FILTER_PARAM_KEYS.pta, "0");
  }
  setMulti(FILTER_PARAM_KEYS.accessoryTypes, filters.accessoryTypes);
  setMulti(FILTER_PARAM_KEYS.connectors, filters.connectors);
  setMulti(FILTER_PARAM_KEYS.wattages, filters.wattages);
  setMulti(FILTER_PARAM_KEYS.gadgetTypes, filters.gadgetTypes);
  if (filters.inStockOnly) {
    params.set(FILTER_PARAM_KEYS.inStock, "1");
  }
  if (filters.sort && filters.sort !== "newest") {
    params.set(FILTER_PARAM_KEYS.sort, filters.sort);
  }
  if (filters.page && filters.page > 1) {
    params.set(FILTER_PARAM_KEYS.page, String(filters.page));
  }
  if (filters.search) {
    params.set(FILTER_PARAM_KEYS.search, filters.search);
  }
  return params;
}
