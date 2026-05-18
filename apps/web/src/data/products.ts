import type {
  ConditionGrade,
  Phone,
  Product,
  ProductCategory,
} from "@store/shared";

/**
 * Static UI metadata for the storefront's three browse-able categories.
 * Drives the FilterSidebar's "applicable grades" block and the empty-state
 * copy on the homepage / shop-landing tiles. The runtime catalog itself
 * lives in MongoDB and is loaded via `getStorefrontCategories()` in
 * `@/lib/storefront`; this file is the source of truth for taglines and
 * grade applicability that are not editable from the admin panel.
 */

interface ProductCategoryMeta {
  id: ProductCategory;
  /** Singular noun, e.g. "Phone". */
  label: string;
  /** Plural noun used as the section title, e.g. "Phones". */
  pluralLabel: string;
  /** URL segment under /shop, e.g. "phones". */
  pathSegment: string;
  /** Whether the category is exposed in the UI today. */
  isActive: boolean;
  /** Shown under the section title on the listing page hero. */
  tagline: string;
  /** Grades that apply to this category — drives FilterSidebar's Grade block. */
  applicableGrades: ConditionGrade[];
  /** 2–3 short trust chips for the homepage / shop-landing tile. */
  trustChips: string[];
  /** Empty-state copy for `Search products` / no results. */
  emptyHint: string;
}

const ALL_GRADES: ConditionGrade[] = [
  "brand-new",
  "genuine",
  "box-open",
  "refurbished",
  "china-water",
  "lcd-shaded",
];

const NON_PHONE_GRADES: ConditionGrade[] = [
  "brand-new",
  "genuine",
  "box-open",
  "refurbished",
];

const PRODUCT_CATEGORIES: ProductCategoryMeta[] = [
  {
    id: "phone",
    label: "Phone",
    pluralLabel: "Phones",
    pathSegment: "phones",
    isActive: true,
    tagline: "Pre-owned phones, condition-graded and PTA-checked.",
    applicableGrades: ALL_GRADES,
    trustChips: ["7-day moneyback", "Battery tested", "PTA status shown"],
    emptyHint: "Try a brand or model — like \u201ciPhone 13\u201d or \u201cGalaxy A54\u201d.",
  },
  {
    id: "accessory",
    label: "Accessory",
    pluralLabel: "Accessories",
    pathSegment: "accessories",
    isActive: true,
    tagline: "Chargers, cables, cases & earbuds — graded just like the phones.",
    applicableGrades: NON_PHONE_GRADES,
    trustChips: ["OEM where marked", "Tested for output", "Replacement warranty"],
    emptyHint: "Try \u201cUSB-C cable\u201d, \u201cMagSafe\u201d or \u201cAirPods\u201d.",
  },
  {
    id: "gadget",
    label: "Gadget",
    pluralLabel: "Gadgets",
    pathSegment: "gadgets",
    isActive: false,
    tagline:
      "Pre-owned consoles, smartwatches, laptops and more — coming soon.",
    applicableGrades: NON_PHONE_GRADES,
    trustChips: ["Function-tested", "Photo-verified", "Warranty on every grade"],
    emptyHint: "Coming soon \u2014 we\u2019re curating the lineup.",
  },
];

export function getCategoryById(
  id: ProductCategory,
): ProductCategoryMeta | undefined {
  return PRODUCT_CATEGORIES.find((category) => category.id === id);
}

/** Build the canonical URL for any product — `/shop/<category>/<slug>`. */
export function productHref(
  product: Product | { category: ProductCategory; slug: string },
): string {
  const meta = getCategoryById(product.category);
  return `/shop/${meta?.pathSegment ?? "phones"}/${product.slug}`;
}

/** Type guards keep call-sites narrow without sprinkling `as` casts. */
export function isPhone(product: Product): product is Phone {
  return product.category === "phone";
}

export function isAccessory(
  product: Product,
): product is Extract<Product, { category: "accessory" }> {
  return product.category === "accessory";
}
