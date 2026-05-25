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
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - The catalog is fully admin-authored. Categories, brands, grades, and
 *     attributes are all slug-keyed strings — there is no hardcoded enum.
 *   - Filters expose only shared catalog axes (brand, grade, price, search)
 *     plus an admin-defined `attributes` map that the storefront filter
 *     sidebar will use to surface per-category options dynamically.
 */

import { type PipelineStage } from "mongoose";

import {
  Brand,
  Category,
  Attribute,
  Grade,
  Offer,
  Product,
  connectDB,
} from "@store/db";
import {
  escapeRegex,
  hasStructuredContent,
  logger,
  normalizeIconName,
  normalizeStructuredContent,
  slugify,
  type Brand as StorefrontBrand,
  type AttributeDescriptor,
  type IconName,
  type GradeDescriptor,
  type Offer as StorefrontOffer,
  type Product as StorefrontProduct,
  type StructuredContent,
} from "@store/shared";

import {
  toStorefrontBrand,
  toStorefrontAttribute,
  toStorefrontGrade,
  toStorefrontOffer,
  toStorefrontProduct,
  type BrandLean,
  type AttributeLean,
  type GradeLean,
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
 * Public sort modes. Includes "price-asc" / "price-desc" which require an
 * aggregation pipeline (see `getStorefrontProductsPage`) because variant
 * prices live inside an array.
 */
export type StorefrontSort =
  | "newest"
  | "recently-updated"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export interface StorefrontProductFilters {
  /** Single category slug — drives URL routing. Use `categorySlugs` for multi. */
  categorySlug?: string;
  /** Multi-category — used by global search. */
  categorySlugs?: string[];
  /** Brand slugs — caller passes one or many; empty/missing = "any brand". */
  brandSlugs?: string[];
  /** Grade slugs — at least one variant must match. */
  gradeSlugs?: string[];
  /** Inclusive variant price bounds in rupees. */
  minPriceRupees?: number;
  maxPriceRupees?: number;
  /**
   * Admin-defined per-category attribute filter. Keys are `Attribute.slug`,
   * values are one or more allowed option strings. A product matches when
   * at least one variant satisfies every attribute axis.
   */
  attributes?: Record<string, string[]>;
  /** Featured-only filter for the homepage strip. */
  isFeatured?: boolean;
  /** Only return products with at least one in-stock variant (`quantity > 0`). */
  inStockOnly?: boolean;
  /** Free-text search across name. */
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
 * Build a category+brand → `{ slug, name }` lookup. Used by the product
 * serializer to fill in `brandName` without an N+1 round-trip.
 */
async function buildBrandLookup(): Promise<
  Map<string, { slug: string; name: string }>
> {
  const brands = await Brand.find()
    .select("slug name categorySlugs")
    .lean<BrandLean[]>();
  return new Map(
    brands.flatMap((brand) =>
      brand.categorySlugs.map((categorySlug) => [
        `${categorySlug}:${brand.slug}`,
        { slug: brand.slug, name: brand.name },
      ] as const),
    ),
  );
}

/**
 * All active brands with the live product count for each. Used by the
 * homepage brand strip and the brand select on shop pages.
 */
export async function getStorefrontBrands(
  categorySlug?: string,
): Promise<StorefrontBrand[]> {
  await connectDB();

  const brandFilter: Record<string, unknown> = { isActive: true };
  const productFilter: Record<string, unknown> = { ...PUBLIC_PRODUCT_FILTER };
  if (categorySlug) {
    brandFilter.categorySlugs = categorySlug;
    productFilter.categorySlug = categorySlug;
  }

  const [brands, counts] = await Promise.all([
    Brand.find(brandFilter)
      .sort({ name: 1 })
      .lean<BrandLean[]>(),
    Product.aggregate<{ _id: string; count: number }>([
      { $match: productFilter },
      { $group: { _id: "$brandSlug", count: { $sum: 1 } } },
    ]),
  ]);
  const countByBrandSlug = new Map(counts.map((row) => [row._id, row.count]));

  return brands.map((brand) =>
    toStorefrontBrand(brand, countByBrandSlug.get(brand.slug) ?? 0),
  );
}

/**
 * Product counts per grade slug within a category (one count per product
 * that has at least one variant in that grade).
 */
export async function getStorefrontGradeCounts(
  categorySlug: string,
): Promise<Record<string, number>> {
  await connectDB();
  const rows = await Product.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        ...PUBLIC_PRODUCT_FILTER,
        categorySlug,
      },
    },
    { $unwind: "$variants" },
    {
      $group: {
        _id: { productId: "$_id", gradeSlug: "$variants.gradeSlug" },
      },
    },
    {
      $group: {
        _id: "$_id.gradeSlug",
        count: { $sum: 1 },
      },
    },
  ]);
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

/**
 * One brand, by slug. Returns null if it doesn't exist or has been deactivated.
 */
export async function getStorefrontBrandBySlug(
  slug: string,
  categorySlug?: string,
): Promise<StorefrontBrand | null> {
  await connectDB();
  const filter: Record<string, unknown> = { slug, isActive: true };
  if (categorySlug) {
    filter.categorySlugs = categorySlug;
  }
  const brand = await Brand.findOne(filter).lean<BrandLean>();
  if (!brand) {
    return null;
  }
  const count = await Product.countDocuments({
    ...PUBLIC_PRODUCT_FILTER,
    brandSlug: brand.slug,
  });
  return toStorefrontBrand(brand, count);
}

type SortSpec = Record<string, 1 | -1>;

function buildSort(sort: StorefrontSort | undefined): SortSpec {
  switch (sort) {
    case "price-asc":
      return { _minPrice: 1, createdAt: -1 };
    case "price-desc":
      return { _minPrice: -1, createdAt: -1 };
    case "name-asc":
      return { name: 1 };
    case "recently-updated":
      return { updatedAt: -1, createdAt: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
}

function sortNeedsMinPrice(sort: StorefrontSort | undefined): boolean {
  return sort === "price-asc" || sort === "price-desc";
}

/**
 * Variant-level `$elemMatch` clause. Returns `null` if the caller didn't
 * supply any variant-level constraints, so we can skip the elemMatch and
 * fall back to the cheaper top-level match.
 *
 * Co-locating all variant filters in a single `$elemMatch` is critical:
 * it forces Mongo to find a *single variant* that satisfies every
 * condition — otherwise filtering by `priceRupees: 50000` AND
 * `attributes.storage: "256GB"` would match a product with a cheap-and-
 * small variant + a separate expensive-and-large variant, which is not
 * what the customer expects.
 */
export function buildVariantElemMatch(
  filters: StorefrontProductFilters,
): Record<string, unknown> | null {
  const clause: Record<string, unknown> = {};

  if (filters.gradeSlugs && filters.gradeSlugs.length > 0) {
    clause.gradeSlug = { $in: filters.gradeSlugs };
  }

  const priceClause: Record<string, number> = {};
  if (
    typeof filters.minPriceRupees === "number" &&
    Number.isFinite(filters.minPriceRupees)
  ) {
    priceClause.$gte = filters.minPriceRupees;
  }
  if (
    typeof filters.maxPriceRupees === "number" &&
    Number.isFinite(filters.maxPriceRupees)
  ) {
    priceClause.$lte = filters.maxPriceRupees;
  }
  if (Object.keys(priceClause).length > 0) {
    clause.priceRupees = priceClause;
  }

  if (filters.attributes) {
    for (const [slug, values] of Object.entries(filters.attributes)) {
      if (values.length > 0) {
        clause[`attributes.${slug}`] = { $in: values };
      }
    }
  }

  if (filters.inStockOnly) {
    clause.quantity = { $gt: 0 };
  }

  return Object.keys(clause).length > 0 ? clause : null;
}

/** Top-level `$match`. Variants are handled separately via `$elemMatch`. */
export function buildTopLevelMatch(
  filters: StorefrontProductFilters,
): Record<string, unknown> {
  const match: Record<string, unknown> = { ...PUBLIC_PRODUCT_FILTER };

  if (filters.categorySlug) {
    match.categorySlug = filters.categorySlug;
  }
  if (filters.categorySlugs && filters.categorySlugs.length > 0) {
    match.categorySlug = { $in: filters.categorySlugs };
  }
  if (filters.isFeatured !== undefined) {
    match.isFeatured = filters.isFeatured;
  }

  if (filters.brandSlugs && filters.brandSlugs.length > 0) {
    match.brandSlug = { $in: Array.from(new Set(filters.brandSlugs)) };
  }

  if (filters.search) {
    const pattern = escapeRegex(filters.search.trim());
    if (pattern) {
      match.name = { $regex: new RegExp(pattern, "i") };
    }
  }

  return match;
}

export async function getStorefrontProducts(
  options: StorefrontProductFilters = {},
): Promise<StorefrontProduct[]> {
  const page = await getStorefrontProductsPage(options);
  return page.products;
}

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
  const page = clampInt(
    options.page,
    MIN_PAGE_NUMBER,
    MAX_PAGE_NUMBER,
    MIN_PAGE_NUMBER,
  );

  const topMatch = buildTopLevelMatch(options);
  const variantMatch = buildVariantElemMatch(options);
  const matchStage: Record<string, unknown> = { ...topMatch };
  if (variantMatch) {
    matchStage.variants = { $elemMatch: variantMatch };
  }

  const sortSpec = buildSort(options.sort);
  const needsMinPrice = sortNeedsMinPrice(options.sort);

  type Row = ProductLean & { _minPrice?: number };

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

  const [aggregateResult, brandLookup] = await Promise.all([
    Product.aggregate<{ items: Row[]; meta: { total: number }[] }>(pipeline),
    buildBrandLookup(),
  ]);

  const result = aggregateResult[0];
  const items = result?.items ?? [];
  const total = result?.meta?.[0]?.total ?? 0;

  if (items.length === 0) {
    return {
      products: [],
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    };
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

/** One product by Mongo id. */
export async function getStorefrontProductById(
  id: string,
): Promise<StorefrontProduct | null> {
  await connectDB();
  const product = await Product.findOne({
    _id: id,
    ...PUBLIC_PRODUCT_FILTER,
  }).lean<ProductLean>();
  if (!product) {
    return null;
  }
  const brandLookup = await buildBrandLookup();
  return toStorefrontProduct(product, brandLookup);
}

/** One product by URL slug. */
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
 * Active offers in display order. Filters out offers whose `expiresAt`
 * is in the past so stale promos don't keep rendering on the home page.
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
 * DB-backed category shape exposed to the storefront. Drives the
 * homepage category tiles, the top nav, and the `/shop/[category]`
 * landing pages.
 */
export interface StorefrontCategory {
  slug: string;
  label: string;
  description: string;
  icon: IconName;
  isActive: boolean;
  sortOrder: number;
  /** Optional structured copy (summary + icon-tagged bullets). */
  content?: StructuredContent;
}

function resolveCategorySlug(category: { slug?: string; label?: string }): string | null {
  const slug = category.slug?.trim();
  if (slug) {
    return slug;
  }
  const fallback = slugify(category.label ?? "", 64);
  return fallback || null;
}

export async function getStorefrontCategories(): Promise<StorefrontCategory[]> {
  await connectDB();
  const categories = await Category.find()
    .sort({ sortOrder: 1, label: 1 })
    .lean();
  if (categories.length === 0) {
    logger.warn(
      "getStorefrontCategories: no categories in DB; storefront may render empty",
    );
  }
  return categories.flatMap((category) => {
    const slug = resolveCategorySlug(category);
    if (!slug) {
      return [];
    }
    const content = normalizeStructuredContent(category.content, category.description);
    return {
      slug,
      label: category.label,
      description: category.description,
      icon: normalizeIconName(category.icon),
      isActive: category.isActive,
      sortOrder: category.sortOrder ?? 0,
      content: hasStructuredContent(content) ? content : undefined,
    };
  });
}

/**
 * DB-backed grade descriptors — drives the grade chip on every
 * `ProductCard`, the filter sidebar's "Grade" block, and the variant
 * selector's grade hint. Replaces the old hardcoded `apps/web/src/data/
 * grades.ts` so editing a grade's copy in admin (`PUT /api/grades/:id`)
 * is reflected on the storefront within the cache TTL.
 */
export async function getStorefrontGrades(): Promise<GradeDescriptor[]> {
  await connectDB();
  const grades = await Grade.find()
    .sort({ categorySlug: 1, label: 1 })
    .lean<GradeLean[]>();
  if (grades.length === 0) {
    logger.warn(
      "getStorefrontGrades: no grades in DB; storefront grade UI will render empty",
    );
  }
  return grades.map(toStorefrontGrade);
}

export async function getStorefrontAttributes(): Promise<AttributeDescriptor[]> {
  await connectDB();
  const attributes = await Attribute.find()
    .sort({ categorySlug: 1, label: 1 })
    .lean<AttributeLean[]>();
  return attributes.map(toStorefrontAttribute);
}

/** Resolve a URL category segment (the category `slug`) to a category. */
export async function getStorefrontCategoryBySlug(
  slug: string,
): Promise<StorefrontCategory | null> {
  await connectDB();
  const category = await Category.findOne({ slug, isActive: true }).lean();
  if (!category) {
    return null;
  }
  const resolvedSlug = resolveCategorySlug(category);
  if (!resolvedSlug) {
    return null;
  }
  const content = normalizeStructuredContent(category.content, category.description);
  return {
    slug: resolvedSlug,
    label: category.label,
    description: category.description,
    icon: normalizeIconName(category.icon),
    isActive: category.isActive,
    sortOrder: category.sortOrder ?? 0,
    content: hasStructuredContent(content) ? content : undefined,
  };
}

/** Internal sanity check the homepage uses to know when DB is empty. */
export async function hasAnyProducts(): Promise<boolean> {
  await connectDB();
  const exists = await Product.exists(PUBLIC_PRODUCT_FILTER);
  return Boolean(exists);
}

/**
 * Products that an admin-flagged offer applies to. After Phase 1 the
 * `originalPriceRupees` field is gone, so "on offer" is reduced to "any
 * featured product" until the Phase 7 `Offer.appliesTo` linking lands.
 */
export async function getStorefrontProductsOnOffer(
  limit: number = DEFAULT_PRODUCT_PAGE_SIZE,
): Promise<StorefrontProduct[]> {
  const capped = Math.max(
    MIN_PAGE_NUMBER,
    Math.min(MAX_PRODUCT_PAGE_SIZE, limit),
  );
  const page = await getStorefrontProductsPage({
    isFeatured: true,
    limit: capped,
  });
  return page.products;
}
