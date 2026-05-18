export type ConditionGrade =
  | "brand-new"
  | "genuine"
  | "box-open"
  | "refurbished"
  | "china-water"
  | "lcd-shaded";

type StorageOption = 64 | 128 | 256 | 512 | 1024;

/**
 * Top-level product taxonomy.
 * - `phone`: smartphones (always have storage + RAM + battery health + PTA flag).
 * - `accessory`: chargers, cables, cases, earbuds, screen protectors, etc.
 * - `gadget`: consoles, smartwatches, laptops, drones — anything that isn't a
 *   phone or accessory.
 */
export type ProductCategory = "phone" | "accessory" | "gadget";

export interface Brand {
  slug: string;
  name: string;
  tagline: string;
  phoneCount: number;
}

export interface BatteryRange {
  minPercent: number;
  maxPercent: number;
}

/** Fields shared across every variant regardless of category. */
export interface BaseVariant {
  id: string;
  grade: ConditionGrade;
  colorName: string;
  priceRupees: number;
  originalPriceRupees: number;
  isInStock: boolean;
  warrantyMonths: number;
  notes?: string;
}

export interface PhoneVariant extends BaseVariant {
  storageGb: StorageOption;
  ramGb: number;
  batteryHealthRange: BatteryRange;
  isPtaApproved: boolean;
}

/** Accessory specifics. Connector + wattage drive shop filters. */
export type AccessoryType =
  | "charger"
  | "cable"
  | "case"
  | "earbuds"
  | "screen-protector"
  | "power-bank"
  | "other";

export type ConnectorType =
  | "usb-c"
  | "lightning"
  | "micro-usb"
  | "wireless"
  | "n-a";

export interface AccessoryVariant extends BaseVariant {
  connector?: ConnectorType;
  wattage?: number;
  lengthMeters?: number;
  isGenuine?: boolean;
}

/** Variant shape for non-phone, non-accessory devices (consoles, watches,
 *  drones). Storage is the only catalogued spec. */
export interface GadgetVariant extends BaseVariant {
  storageGb?: number;
}

/** Fields shared by every product type. */
interface BaseProduct {
  id: string;
  slug: string;
  brandSlug: string;
  /**
   * Display name resolved from the brand. Set by `toStorefrontProduct`
   * after a single brand-id → brand lookup so cards/details don't need a
   * client-side brands array. May be omitted only by callers that build
   * `Product`-shaped objects without a brand context.
   */
  brandName?: string;
  modelName: string;
  imageUrl: string;
  galleryUrls: string[];
  releaseYear: number;
  highlights: string[];
  isFeatured: boolean;
}

export interface Phone extends BaseProduct {
  category: "phone";
  variants: PhoneVariant[];
}

export interface Accessory extends BaseProduct {
  category: "accessory";
  accessoryType: AccessoryType;
  variants: AccessoryVariant[];
}

export interface Gadget extends BaseProduct {
  category: "gadget";
  gadgetType: string;
  variants: GadgetVariant[];
}

/** Discriminated union — TS narrows on `product.category`. */
export type Product = Phone | Accessory | Gadget;

/**
 * Loose type that any caller can use when it just needs a generic variant.
 * Useful for cart lines, order items, and other places that don't care about
 * category-specific fields.
 */
export type AnyVariant = PhoneVariant | AccessoryVariant | GadgetVariant;

export interface Offer {
  id: string;
  slug: string;
  title: string;
  description: string;
  discountLabel: string;
  expiresAt: string;
  accentColor: "emerald" | "amber" | "rose" | "sky";
  badgeLabel: string;
}

export type GradeTone = "accent" | "neutral" | "info" | "warn" | "danger" | "dark";

export interface GradeDescriptor {
  grade: ConditionGrade;
  label: string;
  shortLabel: string;
  description: string;
  cosmeticNotes: string;
  functionalNotes: string;
  tone: GradeTone;
}

