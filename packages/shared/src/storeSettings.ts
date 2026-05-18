/**
 * Runtime store settings — the values an admin can change without a deploy.
 *
 * Two layers cooperate:
 *   1. `STORE_SETTING_DEFAULTS` here — the factory defaults baked into the
 *      bundle. They guarantee the storefront always has a sane value, even
 *      before the admin has saved anything or if Mongo is unreachable.
 *   2. The `Setting` collection in MongoDB — the admin's overrides. Every
 *      key managed here is stored with the `store.` prefix so it can't
 *      collide with future ad-hoc settings (e.g. `feature.<name>`).
 *
 * Consumers MUST go through `getStoreSettings()` (in `@store/db`) on the
 * server, or receive the values as props from a server component. Never
 * import `STORE_SETTING_DEFAULTS` directly from a UI component — that
 * defeats the whole point of admin manageability.
 */

export interface StoreSettings {
  /** Storefront brand name shown in the header, footer, page titles, and AI assistant greeting. */
  siteName: string;
  /** One-line storefront tagline used in the homepage hero / OG metadata. */
  siteTagline: string;

  /** Mobile/cell number callers reach for sales + support. */
  supportPhone: string;
  /** Landline number printed in the footer. */
  supportLandline: string;
  /** Public support email shown on the storefront and used in transactional copy. */
  supportEmail: string;
  /** WhatsApp number in international digits-only form, e.g. `923204862403`. */
  whatsappNumber: string;

  /** First line of the physical store address (street/area). */
  storeAddressLine1: string;
  /** Second line of the physical store address (city/country). */
  storeAddressLine2: string;
  /** Human-readable opening hours, e.g. `Mon–Sat · 11 AM – 9 PM`. */
  storeHours: string;

  socialFacebook: string;
  socialInstagram: string;
  socialTiktok: string;
  socialYoutube: string;
  socialGoogleMaps: string;

  /** Order subtotal in rupees above which delivery is free. */
  freeDeliveryThresholdRupees: number;
  /** Default warranty period (in months) shown on product pages. */
  defaultWarrantyMonths: number;
  /** Discount applied (% off) for full bank-transfer pre-payment. */
  bankTransferDiscountPercent: number;
  /** Number of days the moneyback window stays open. */
  moneybackDays: number;
}

export const STORE_SETTING_DEFAULTS: StoreSettings = {
  siteName: "Ibrahim Mobile Store",
  siteTagline: "Pakistan's most trusted pre-owned phone store.",

  supportPhone: "+92 320 4862403",
  supportLandline: "+92 42 37245459",
  supportEmail: "alyaschudry@gmail.com",
  whatsappNumber: "923204862403",

  storeAddressLine1: "Hassan Centre, Hall Road",
  storeAddressLine2: "Lahore, Pakistan",
  storeHours: "Mon–Sat · 11 AM – 9 PM",

  socialFacebook: "https://www.facebook.com/p/Ibrahim-Mobile-Store-100095570557900/",
  socialInstagram: "https://www.instagram.com/ibrahimmobilestore",
  socialTiktok: "https://www.tiktok.com/@ibrahimmobilestore",
  socialYoutube: "https://youtube.com/@ibrahimmobilestore",
  socialGoogleMaps: "https://maps.app.goo.gl/xzQQDXBdV6R4JXP98",

  freeDeliveryThresholdRupees: 50_000,
  defaultWarrantyMonths: 6,
  bankTransferDiscountPercent: 5,
  moneybackDays: 15,
};

/** Prefix used on every `Setting.key` that backs a `StoreSettings` field. */
export const STORE_SETTING_KEY_PREFIX = "store.";

/** Stable list of every managed key, derived from the defaults to stay in sync. */
export const STORE_SETTING_KEYS = Object.keys(STORE_SETTING_DEFAULTS) as Array<keyof StoreSettings>;

/**
 * Maps a `StoreSettings` field to the Mongo `Setting.group` it belongs to.
 * Used by the admin UI for tabbed editing and by the API for filtering.
 */
export const STORE_SETTING_GROUPS = {
  branding: ["siteName", "siteTagline"] as const,
  contact: ["supportPhone", "supportLandline", "supportEmail", "whatsappNumber"] as const,
  address: ["storeAddressLine1", "storeAddressLine2", "storeHours"] as const,
  social: [
    "socialFacebook",
    "socialInstagram",
    "socialTiktok",
    "socialYoutube",
    "socialGoogleMaps",
  ] as const,
  policy: [
    "freeDeliveryThresholdRupees",
    "defaultWarrantyMonths",
    "bankTransferDiscountPercent",
    "moneybackDays",
  ] as const,
} satisfies Record<string, ReadonlyArray<keyof StoreSettings>>;

type StoreSettingGroup = keyof typeof STORE_SETTING_GROUPS;

/** Convert `siteName` → `store.siteName` (the actual Mongo key). */
export function toStoreSettingKey(field: keyof StoreSettings): string {
  return `${STORE_SETTING_KEY_PREFIX}${field}`;
}

/** Reverse of `toStoreSettingKey`; returns `null` for unrelated keys. */
export function fromStoreSettingKey(key: string): keyof StoreSettings | null {
  if (!key.startsWith(STORE_SETTING_KEY_PREFIX)) {
    return null;
  }
  const stripped = key.slice(STORE_SETTING_KEY_PREFIX.length);
  return stripped in STORE_SETTING_DEFAULTS ? (stripped as keyof StoreSettings) : null;
}

/** Find which group a managed field belongs to (used by serializers). */
export function groupForField(field: keyof StoreSettings): StoreSettingGroup {
  for (const [group, fields] of Object.entries(STORE_SETTING_GROUPS) as Array<
    [StoreSettingGroup, ReadonlyArray<keyof StoreSettings>]
  >) {
    if (fields.includes(field)) {
      return group;
    }
  }
  // Defensive — every key in STORE_SETTING_DEFAULTS is also in STORE_SETTING_GROUPS,
  // so this branch is unreachable unless the two lists drift apart.
  throw new Error(`Field "${field}" is not assigned to a settings group.`);
}

/**
 * Coerces a raw value coming back from Mongo into the typed value expected by
 * `StoreSettings`. Returns `null` if the value can't be safely coerced — the
 * caller should then fall back to the default.
 */
export function coerceStoreSettingValue<K extends keyof StoreSettings>(
  field: K,
  raw: unknown,
): StoreSettings[K] | null {
  const expected = typeof STORE_SETTING_DEFAULTS[field];
  if (expected === "number") {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw as StoreSettings[K];
    }
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed as StoreSettings[K];
      }
    }
    return null;
  }
  if (expected === "string") {
    if (typeof raw === "string") {
      return raw as StoreSettings[K];
    }
    return null;
  }
  return null;
}
