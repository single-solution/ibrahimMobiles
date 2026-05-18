import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import { PRODUCT_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import {
  badRequest,
  created,
  FIELD_LIMITS,
  isValidationError,
  isValidId,
  MAX_PRODUCT_RELEASE_YEAR,
  MIN_PRODUCT_RELEASE_YEAR,
  ok,
  parseBody,
  toUnknownArray,
  validateString,
} from "@store/shared";

import {
  ACCESSORY_TYPES,
  type AccessoryType,
  Brand,
  CATEGORY_IDS,
  type CategoryId,
  connectDB,
  handleMongoError,
  Product,
} from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";
import { slugify } from "@/lib/services/slug";

import { summariseProduct, type ProductLean } from "@/lib/serializers/product";
import { type BrandLean } from "@/lib/serializers/brand";
import type { AdminProductSummary } from "@/types/admin";

export async function GET(request: Request) {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  await connectDB();
  const { page, limit, skip, search, searchPattern } = readListOptions(request);
  const url = new URL(request.url);
  const categoryFilter = url.searchParams.get("category");
  const includeArchived = url.searchParams.get("includeArchived") === "true";

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { modelName: { $regex: searchPattern, $options: "i" } },
      { slug: { $regex: searchPattern, $options: "i" } },
    ];
  }
  if (categoryFilter && (CATEGORY_IDS as readonly string[]).includes(categoryFilter)) {
    filter.category = categoryFilter;
  }
  if (!includeArchived) {
    filter.isArchived = { $ne: true };
  }

  const [docs, total, brandDocs] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<ProductLean[]>(),
    Product.countDocuments(filter),
    Brand.find().lean<BrandLean[]>(),
  ]);

  const brandsById = new Map(brandDocs.map((brand) => [brand._id.toString(), brand]));
  const items = docs.map((doc) => summariseProduct(doc, brandsById));

  const payload: ListResponse<AdminProductSummary> = { items, total, page, limit };
  return ok(payload);
}

interface ProductCreateInput {
  modelName?: unknown;
  slug?: unknown;
  brandId?: unknown;
  category?: unknown;
  accessoryType?: unknown;
  gadgetType?: unknown;
  imageUrl?: unknown;
  galleryUrls?: unknown;
  releaseYear?: unknown;
  highlights?: unknown;
  isFeatured?: unknown;
  isActive?: unknown;
}

const ALLOWED_CATEGORIES = new Set(CATEGORY_IDS as readonly string[]);
const ALLOWED_ACCESSORY_TYPES = new Set(ACCESSORY_TYPES as readonly string[]);

export async function POST(request: Request) {
  const { actor, response } = await requireSession("product_create");
  if (response) {
    return response;
  }

  const body = await parseBody<ProductCreateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const modelNameResult = validateString(body.modelName, {
    label: "Model name",
    max: PRODUCT_FIELD_LIMITS.modelName,
  });
  if (isValidationError(modelNameResult)) {
    return badRequest(modelNameResult.error);
  }

  const imageUrlResult = validateString(body.imageUrl, {
    label: "Image URL",
    max: PRODUCT_FIELD_LIMITS.imageUrl,
  });
  if (isValidationError(imageUrlResult)) {
    return badRequest(imageUrlResult.error);
  }

  if (!isValidId(body.brandId)) {
    return badRequest("Brand ID must be a valid Mongo ObjectId.");
  }
  if (typeof body.category !== "string" || !ALLOWED_CATEGORIES.has(body.category)) {
    return badRequest(`category must be one of: ${Array.from(ALLOWED_CATEGORIES).join(", ")}`);
  }
  const category = body.category as CategoryId;

  let accessoryType: AccessoryType | undefined;
  if (category === "accessory") {
    if (typeof body.accessoryType !== "string" || !ALLOWED_ACCESSORY_TYPES.has(body.accessoryType)) {
      return badRequest(`accessoryType must be one of: ${Array.from(ALLOWED_ACCESSORY_TYPES).join(", ")}`);
    }
    accessoryType = body.accessoryType as AccessoryType;
  }

  let gadgetType: string | undefined;
  if (category === "gadget" && typeof body.gadgetType === "string") {
    gadgetType = body.gadgetType.trim().slice(0, FIELD_LIMITS.shortLabel);
  }

  const releaseYear = typeof body.releaseYear === "number" ? body.releaseYear : Number(body.releaseYear);
  if (
    !Number.isFinite(releaseYear) ||
    releaseYear < MIN_PRODUCT_RELEASE_YEAR ||
    releaseYear > MAX_PRODUCT_RELEASE_YEAR
  ) {
    return badRequest(
      `Release year must be between ${MIN_PRODUCT_RELEASE_YEAR} and ${MAX_PRODUCT_RELEASE_YEAR}.`,
    );
  }

  const slug =
    typeof body.slug === "string" && body.slug.trim().length > 0
      ? slugify(body.slug, PRODUCT_FIELD_LIMITS.slug)
      : slugify(modelNameResult, PRODUCT_FIELD_LIMITS.slug);
  if (slug.length === 0) {
    return badRequest("Slug could not be derived from model name.");
  }

  const galleryUrls = toUnknownArray(body.galleryUrls)
    .filter((url): url is string => typeof url === "string" && url.length <= PRODUCT_FIELD_LIMITS.imageUrl);
  const highlights = toUnknownArray(body.highlights)
    .filter((highlight): highlight is string => typeof highlight === "string")
    .map((highlight) => highlight.trim())
    .filter((highlight) => highlight.length > 0 && highlight.length <= FIELD_LIMITS.shortText)
    .slice(0, PRODUCT_FIELD_LIMITS.highlightCount);

  await connectDB();
  try {
    const brandExists = await Brand.findById(body.brandId).lean();
    if (!brandExists) {
      return badRequest("Brand not found.");
    }

    const doc = await Product.create({
      slug,
      modelName: modelNameResult,
      brandId: body.brandId,
      category,
      accessoryType,
      gadgetType,
      imageUrl: imageUrlResult,
      galleryUrls,
      releaseYear,
      highlights,
      isFeatured: body.isFeatured === true,
      isActive: body.isActive !== false,
      isArchived: false,
      variants: [],
    });

    await recordActivity({
      actor,
      action: "created",
      resourceType: "product",
      resourceId: doc._id.toString(),
      resourceLabel: doc.modelName,
    });
    // New product is now visible to customers — flush both the
    // admin dashboard cache (so models-listed / unitsInStock updates)
    // and the storefront cache (so listings, counts, hero phones
    // reflect the new SKU immediately).
    bustAdminCaches();

    const brandDocs = await Brand.find().lean<BrandLean[]>();
    const brandsById = new Map(brandDocs.map((brand) => [brand._id.toString(), brand]));
    return created(summariseProduct(doc.toObject() as ProductLean, brandsById));
  } catch (error) {
    return handleMongoError(error);
  }
}
