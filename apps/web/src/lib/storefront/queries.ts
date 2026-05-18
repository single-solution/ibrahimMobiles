/**
 * Server-side data layer for the public storefront.
 *
 * All queries here:
 *   - Run on the server (these are async functions imported by RSC pages /
 *     route handlers — never bundled to the client).
 *   - Use Mongoose `lean()` so we never serialise hydrated documents.
 *   - Apply the public visibility filter
 *     (`isActive: true, isArchived: { $ne: true }`) so a draft / archived
 *     product never leaks to a customer.
 *   - Return the public catalog types from `@store/shared` so storefront
 *     components only ever see customer-safe shapes.
 *
 * Caching: pages that import these helpers should add `export const dynamic
 * = "force-dynamic"` (or per-request `revalidate = 0`) when they need the
 * freshest data — e.g. price changes from admin should appear immediately.
 */

import { Types, type PipelineStage } from "mongoose";

import {
  Brand,
  Category,
  Offer,
  Product,
  connectDB,
  type AccessoryType,
  type CategoryAttributes,
  type ConditionGrade,
  type ConnectorType,
} from "@store/db";
import {
  escapeRegex,
  logger,
  type Brand as StorefrontBrand,
  type Offer as StorefrontOffer,
  type Product as StorefrontProduct,
  type ProductCategory,
} from "@store/shared";

import {
  toStorefrontBrand,
  toStorefrontOffer,
  toStorefrontProduct,
  type BrandLean,
  type OfferLean,
  type ProductLean,
} from "@/lib/storefront/serializers";

// Public visibility filter — re-used by every product query so a draft / off
// product can't slip through.
const PUBLIC_PRODUCT_FILTER = {
  isActive: true,
  isArchived: { $ne: true },
} as const;

/** Default page size when a caller doesn't override `limit`. */
const DEFAULT_PRODUCT_PAGE_SIZE = 24;
/** Hard cap on page size — guards against scraping/over-fetch. */
const MAX_PRODUCT_PAGE_SIZE = 60;
/** Minimum and maximum 1-based page index accepted from the URL. */
const MIN_PAGE_NUMBER = 1;
const MAX_PAGE_NUMBER = 10_000;
/** Default "active offers" cap for the homepage offer strip. */
const DEFAULT_OFFER_LIMIT = 12;

/**
 * Public sort modes. Mapped to a Mongo sort spec by `buildSort`. Includes
 * "price-asc" / "price-desc" which require an aggregation pipeline (see
 * `getStorefrontProducts` below) because variant prices live inside an array.
 */
export type StorefrontSort =
  | "newest"
  | "release"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export interface StorefrontProductFilters {
  /** Single category — drives URL routing. Use `categories` for multi. */
  category?: ProductCategory;
  /** Multi-category — used by global search. */
  categories?: ProductCategory[];
  /** Brand slugs — caller passes one or many; an empty/missing array means "any brand". */
  brandSlugs?: string[];
  /** Multi-grade — at least one variant must match. */
  grades?: ConditionGrade[];
  /** Inclusive variant price bounds in rupees. */
  minPriceRupees?: number;
  maxPriceRupees?: number;
  /** Phone storage in GB — at least one variant must match. */
  storageGb?: number[];
  /** Phone RAM in GB. */
  ramGb?: number[];
  /** Phone battery health floor (e.g. 90 means at-least-90% bucket). */
  minBatteryHealthPercent?: number;
  /** PTA approval. true = PTA-only, false = non-PTA only, undefined = either. */
  isPtaApproved?: boolean;
  /** Accessory sub-types. */
  accessoryTypes?: AccessoryType[];
  connectors?: ConnectorType[];
  wattages?: number[];
  /** Gadget free-form types. */
  gadgetTypes?: string[];
  /** Featured-only filter for the homepage strip. */
  isFeatured?: boolean;
  /** Only return products with at least one in-stock variant. */
  inStockOnly?: boolean;
  /** Free-text search across modelName + highlights. */
  search?: string;
  /** Cap result size; default 24. */
  limit?: number;
  /** 1-based page number; default 1. */
  page?: number;
  /** Sort mode. */
  sort?: StorefrontSort;
}

/** Result type for paginated product lists. */
export interface StorefrontProductPage {
  products: StorefrontProduct[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Build a brand-id → `{ slug, name }` lookup. Used by the product serializer
 * to turn ObjectId references into URL-friendly slugs **and** display names
 * without an N+1 round-trip.
 */
async function buildBrandLookup(): Promise<
  Map<string, { slug: string; name: string }>
> {
  const brands = await Brand.find().select("_id slug name").lean<BrandLean[]>();
  return new Map(
    brands.map((brand) => [
      brand._id.toString(),
      { slug: brand.slug, name: brand.name },
    ]),
  );
}

/** Resolve multiple brand slugs to ObjectIds. Inactive brands are dropped. */
async function brandIdsForSlugs(slugs: string[]): Promise<Types.ObjectId[]> {
  if (slugs.length === 0) {
    return [];
  }
  const brands = await Brand.find({ slug: { $in: slugs }, isActive: true })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();
  return brands.map((brand) => brand._id);
}

/**
 * All active brands with the live product count for each. Used by the
 * homepage brand strip and the brand select on shop pages.
 */
export async function getStorefrontBrands(): Promise<StorefrontBrand[]> {
  await connectDB();

  const [brands, counts] = await Promise.all([
    Brand.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean<BrandLean[]>(),
    Product.aggregate<{ _id: import("mongoose").Types.ObjectId; count: number }>([
      { $match: PUBLIC_PRODUCT_FILTER },
      { $group: { _id: "$brandId", count: { $sum: 1 } } },
    ]),
  ]);
  const countByBrandId = new Map(
    counts.map((row) => [row._id.toString(), row.count]),
  );

  return brands.map((brand) =>
    toStorefrontBrand(brand, countByBrandId.get(brand._id.toString()) ?? 0),
  );
}

/**
 * One brand, by slug. Returns null if it doesn't exist or has been deactivated.
 */
export async function getStorefrontBrandBySlug(
  slug: string,
): Promise<StorefrontBrand | null> {
  await connectDB();
  const brand = await Brand.findOne({ slug, isActive: true }).lean<BrandLean>();
  if (!brand) {
    return null;
  }
  const count = await Product.countDocuments({
    ...PUBLIC_PRODUCT_FILTER,
    brandId: brand._id,
  });
  return toStorefrontBrand(brand, count);
}

type SortSpec = Record<string, 1 | -1>;

function buildSort(sort: StorefrontSort | undefined): SortSpec {
  switch (sort) {
    case "release":
      return { releaseYear: -1, createdAt: -1 };
    case "price-asc":
      return { _minPrice: 1, createdAt: -1 };
    case "price-desc":
      return { _minPrice: -1, createdAt: -1 };
    case "name-asc":
      return { modelName: 1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
}

/**
 * Whether the requested sort actually needs the synthesized `_minPrice`
 * field. Skipping the `$addFields` stage when it's not needed saves a
 * non-trivial per-document cost on the dominant "newest" / "release"
 * sort paths.
 */
function sortNeedsMinPrice(sort: StorefrontSort | undefined): boolean {
  return sort === "price-asc" || sort === "price-desc";
}

/**
 * Build the variant-level $elemMatch clause from a filter set. Returns
 * `null` if the caller didn't supply any variant-level constraints, so we
 * can skip the elemMatch and fall back to the cheaper top-level match.
 *
 * Co-locating all variant filters in a single `$elemMatch` is critical: it
 * forces Mongo to find a *single variant* that satisfies every condition
 * — otherwise filtering by `priceRupees: 50000` AND `storageGb: 256` would
 * match a product with a cheap-and-small variant + a separate
 * expensive-and-large variant, which is not what the customer expects.
 */
function buildVariantElemMatch(
  filters: StorefrontProductFilters,
): Record<string, unknown> | null {
  const clause: Record<string, unknown> = {};

  if (filters.grades && filters.grades.length > 0) {
    clause.grade = { $in: filters.grades };
  }

  const priceClause: Record<string, number> = {};
  if (typeof filters.minPriceRupees === "number" && Number.isFinite(filters.minPriceRupees)) {
    priceClause.$gte = filters.minPriceRupees;
  }
  if (typeof filters.maxPriceRupees === "number" && Number.isFinite(filters.maxPriceRupees)) {
    priceClause.$lte = filters.maxPriceRupees;
  }
  if (Object.keys(priceClause).length > 0) {
    clause.priceRupees = priceClause;
  }

  if (filters.storageGb && filters.storageGb.length > 0) {
    clause.storageGb = { $in: filters.storageGb };
  }
  if (filters.ramGb && filters.ramGb.length > 0) {
    clause.ramGb = { $in: filters.ramGb };
  }
  if (typeof filters.minBatteryHealthPercent === "number") {
    clause.batteryHealthMinPercent = { $gte: filters.minBatteryHealthPercent };
  }
  if (typeof filters.isPtaApproved === "boolean") {
    clause.isPtaApproved = filters.isPtaApproved;
  }
  if (filters.connectors && filters.connectors.length > 0) {
    clause.connector = { $in: filters.connectors };
  }
  if (filters.wattages && filters.wattages.length > 0) {
    clause.wattage = { $in: filters.wattages };
  }
  if (filters.inStockOnly) {
    clause.isInStock = true;
  }

  return Object.keys(clause).length > 0 ? clause : null;
}

/**
 * Build the top-level $match. Variants are handled separately via $elemMatch.
 */
async function buildTopLevelMatch(
  filters: StorefrontProductFilters,
): Promise<Record<string, unknown> | null> {
  const match: Record<string, unknown> = { ...PUBLIC_PRODUCT_FILTER };

  if (filters.category) {
    match.category = filters.category;
  }
  if (filters.categories && filters.categories.length > 0) {
    match.category = { $in: filters.categories };
  }
  if (filters.isFeatured !== undefined) {
    match.isFeatured = filters.isFeatured;
  }
  if (filters.accessoryTypes && filters.accessoryTypes.length > 0) {
    match.accessoryType = { $in: filters.accessoryTypes };
  }
  if (filters.gadgetTypes && filters.gadgetTypes.length > 0) {
    match.gadgetType = { $in: filters.gadgetTypes };
  }

  if (filters.brandSlugs && filters.brandSlugs.length > 0) {
    const ids = await brandIdsForSlugs(Array.from(new Set(filters.brandSlugs)));
    if (ids.length === 0) {
      return null;
    }
    match.brandId = { $in: ids };
  }

  if (filters.search) {
    const pattern = escapeRegex(filters.search.trim());
    if (pattern) {
      const regex = new RegExp(pattern, "i");
      match.$or = [
        { modelName: regex },
        { highlights: { $elemMatch: { $regex: regex } } },
      ];
    }
  }

  return match;
}

/**
 * Generic product list with the public visibility filter applied. Supports
 * brand / grade / price / spec filtering, free-text search, sort modes and
 * pagination via `getStorefrontProductsPage`. Returns just the items array.
 */
export async function getStorefrontProducts(
  options: StorefrontProductFilters = {},
): Promise<StorefrontProduct[]> {
  const page = await getStorefrontProductsPage(options);
  return page.products;
}

/**
 * Same as `getStorefrontProducts` but returns the full pagination envelope
 * (items + total + page metadata). Use this for shop list pages so the UI
 * can show "12 results" and a real Next/Prev paginator.
 */
export async function getStorefrontProductsPage(
  options: StorefrontProductFilters = {},
): Promise<StorefrontProductPage> {
  await connectDB();
  const pageSize = clampInt(
    options.limit,
    MIN_PAGE_NUMBER,
    MAX_PRODUCT_PAGE_SIZE,
    DEFAULT_PRODUCT_PAGE_SIZE,
  );
  const page = clampInt(options.page, MIN_PAGE_NUMBER, MAX_PAGE_NUMBER, MIN_PAGE_NUMBER);

  const topMatch = await buildTopLevelMatch(options);
  if (!topMatch) {
    return { products: [], total: 0, page, pageSize, pageCount: 0 };
  }

  const variantMatch = buildVariantElemMatch(options);
  const matchStage: Record<string, unknown> = { ...topMatch };
  if (variantMatch) {
    matchStage.variants = { $elemMatch: variantMatch };
  }

  const sortSpec = buildSort(options.sort);
  const needsMinPrice = sortNeedsMinPrice(options.sort);

  type Row = ProductLean & { _minPrice?: number };

  // Build the pipeline incrementally so we only pay the `$addFields` cost
  // when the sort key actually needs the synthesized `_minPrice` field.
  // For the dominant "newest" / "release" / "name-asc" paths that's a
  // full per-document computation we skip entirely.
  const itemsStages: PipelineStage.FacetPipelineStage[] = [];
  if (needsMinPrice) {
    itemsStages.push({
      $addFields: { _minPrice: { $min: "$variants.priceRupees" } },
    });
  }
  itemsStages.push(
    { $sort: sortSpec },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
  );

  const pipeline: PipelineStage[] = [
    { $match: matchStage },
    {
      $facet: {
        items: itemsStages,
        meta: [{ $count: "total" }],
      },
    },
  ];

  // Run the aggregation and the brand lookup in parallel — `buildBrandLookup`
  // is a separate collection scan, so issuing both concurrently shaves one
  // round-trip's worth of latency off every shop visit.
  const [aggregateResult, brandLookup] = await Promise.all([
    Product.aggregate<{ items: Row[]; meta: { total: number }[] }>(pipeline),
    buildBrandLookup(),
  ]);

  const result = aggregateResult[0];
  const items = result?.items ?? [];
  const total = result?.meta?.[0]?.total ?? 0;

  if (items.length === 0) {
    return { products: [], total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
  }

  const products: StorefrontProduct[] = [];
  for (const product of items) {
    const converted = toStorefrontProduct(product, brandLookup);
    if (converted) {
      products.push(converted);
    }
  }

  return {
    products,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function clampInt(
  raw: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback;
  }
  const truncated = Math.trunc(raw);
  if (truncated < min) {
    return min;
  }
  if (truncated > max) {
    return max;
  }
  return truncated;
}

/**
 * One product by URL slug. Caller is responsible for matching the URL
 * `category` (we still allow returning the product if the slug exists in a
 * different category — the page-level helper checks consistency).
 */
export async function getStorefrontProductBySlug(
  slug: string,
): Promise<StorefrontProduct | null> {
  await connectDB();
  const product = await Product.findOne({
    slug: slug.toLowerCase(),
    ...PUBLIC_PRODUCT_FILTER,
  }).lean<ProductLean>();
  if (!product) {
    return null;
  }
  const brandLookup = await buildBrandLookup();
  return toStorefrontProduct(product, brandLookup);
}

/**
 * Active offers in display order. Filters out offers whose `expiresAt` is in
 * the past so stale promos don't keep rendering on the home page.
 */
export async function getStorefrontOffers(): Promise<StorefrontOffer[]> {
  await connectDB();
  const now = new Date();
  const offers = await Offer.find({
    isActive: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
  })
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(DEFAULT_OFFER_LIMIT)
    .lean<OfferLean[]>();
  return offers.map(toStorefrontOffer);
}

/**
 * DB-backed category shape exposed to the storefront. Drives the homepage
 * category tiles, the top nav, and the `/shop/[category]` landing pages.
 */
export interface StorefrontCategory extends CategoryAttributes {
  /** Stable category key (`phone` | `accessory` | `gadget`) used by the UI. */
  id: ProductCategory;
}
type StorefrontCategoryShape = Omit<StorefrontCategory, "createdAt" | "updatedAt">;

export async function getStorefrontCategories(): Promise<StorefrontCategoryShape[]> {
  await connectDB();
  const categories = await Category.find()
    .sort({ sortOrder: 1 })
    .lean<CategoryAttributes[]>();
  if (categories.length === 0) {
    logger.warn("getStorefrontCategories: no categories in DB; storefront may render empty");
  }
  return categories.map((category) => ({
    id: category.categoryId,
    categoryId: category.categoryId,
    label: category.label,
    pluralLabel: category.pluralLabel,
    pathSegment: category.pathSegment,
    isActive: category.isActive,
    tagline: category.tagline,
    applicableGrades: category.applicableGrades,
    trustChips: category.trustChips,
    emptyHint: category.emptyHint,
    sortOrder: category.sortOrder,
  }));
}

/** Resolve a URL `pathSegment` (`phones` / `accessories`) to a category. */
export async function getStorefrontCategoryByPathSegment(
  segment: string,
): Promise<StorefrontCategoryShape | null> {
  await connectDB();
  const category = await Category.findOne({ pathSegment: segment }).lean<CategoryAttributes>();
  if (!category) {
    return null;
  }
  return {
    id: category.categoryId,
    categoryId: category.categoryId,
    label: category.label,
    pluralLabel: category.pluralLabel,
    pathSegment: category.pathSegment,
    isActive: category.isActive,
    tagline: category.tagline,
    applicableGrades: category.applicableGrades,
    trustChips: category.trustChips,
    emptyHint: category.emptyHint,
    sortOrder: category.sortOrder,
  };
}

/** Internal sanity check the homepage uses to know when DB is empty. */
export async function hasAnyProducts(): Promise<boolean> {
  await connectDB();
  const exists = await Product.exists(PUBLIC_PRODUCT_FILTER);
  return Boolean(exists);
}

/**
 * Products that currently have at least one variant where the customer
 * pays less than the list price. Used by the /deals page.
 */
export async function getStorefrontProductsOnOffer(
  limit: number = DEFAULT_PRODUCT_PAGE_SIZE,
): Promise<StorefrontProduct[]> {
  await connectDB();
  const docs = await Product.aggregate<ProductLean & { _id: Types.ObjectId }>([
    { $match: PUBLIC_PRODUCT_FILTER },
    {
      $match: {
        $expr: {
          $anyElementTrue: {
            $map: {
              input: "$variants",
              as: "variant",
              in: { $gt: ["$$variant.originalPriceRupees", "$$variant.priceRupees"] },
            },
          },
        },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: Math.max(MIN_PAGE_NUMBER, Math.min(MAX_PRODUCT_PAGE_SIZE, limit)) },
  ]);

  if (docs.length === 0) {
    return [];
  }
  const brandLookup = await buildBrandLookup();
  const products: StorefrontProduct[] = [];
  for (const doc of docs) {
    const converted = toStorefrontProduct(doc, brandLookup);
    if (converted) {
      products.push(converted);
    }
  }
  return products;
}

/**
 * Live counts per category. Returns a `Map<ProductCategory, number>` covering
 * every active category — `undefined` is mapped to 0. One aggregation, no
 * fan-out.
 */
export async function getStorefrontProductCountsByCategory(): Promise<
  Map<ProductCategory, number>
> {
  await connectDB();
  const rows = await Product.aggregate<{ _id: ProductCategory; count: number }>([
    { $match: PUBLIC_PRODUCT_FILTER },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
}
