import {
  ACCESSORY_TYPES,
  Brand,
  CATEGORY_IDS,
  connectDB,
  handleMongoError,
  Order,
  Product,
} from "@store/db";
import {
  badRequest,
  conflict,
  FIELD_LIMITS,
  isValidId,
  isValidationError,
  MAX_PRODUCT_RELEASE_YEAR,
  MIN_PRODUCT_RELEASE_YEAR,
  noContent,
  notFound,
  ok,
  parseBody,
  toUnknownArray,
  validateString,
} from "@store/shared";

import { requireSession } from "@/lib/api/requireSession";
import { bustAdminCaches } from "@/lib/cached";
import { type BrandLean } from "@/lib/serializers/brand";
import { toProductResponse, type ProductLean } from "@/lib/serializers/product";
import { recordActivity } from "@/lib/services/activityLog";
import { slugify } from "@/lib/services/slug";
import { PRODUCT_FIELD_LIMITS } from "@/lib/api/fieldLimits";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  const doc = await Product.findById(id).lean<ProductLean>();
  if (!doc) {
    return notFound("Product not found");
  }

  const brand = await Brand.findById(doc.brandId).lean<BrandLean>();
  return ok(toProductResponse(doc, brand ?? undefined));
}

interface ProductUpdateInput {
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
  isArchived?: unknown;
}

const ALLOWED_CATEGORIES = new Set(CATEGORY_IDS as readonly string[]);
const ALLOWED_ACCESSORY_TYPES = new Set(ACCESSORY_TYPES as readonly string[]);

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("product_update");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<ProductUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const update: Record<string, unknown> = {};

  if (body.modelName !== undefined) {
    const result = validateString(body.modelName, {
      label: "Model name",
      max: PRODUCT_FIELD_LIMITS.modelName,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.modelName = result;
  }
  if (typeof body.slug === "string" && body.slug.trim().length > 0) {
    update.slug = slugify(body.slug, PRODUCT_FIELD_LIMITS.slug);
  }
  if (typeof body.brandId === "string" && isValidId(body.brandId)) {
    update.brandId = body.brandId;
  }
  if (typeof body.category === "string") {
    if (!ALLOWED_CATEGORIES.has(body.category)) {
      return badRequest(`category must be one of: ${Array.from(ALLOWED_CATEGORIES).join(", ")}`);
    }
    update.category = body.category;
  }
  if (body.accessoryType !== undefined) {
    if (typeof body.accessoryType === "string" && ALLOWED_ACCESSORY_TYPES.has(body.accessoryType)) {
      update.accessoryType = body.accessoryType;
    } else if (body.accessoryType === null) {
      update.accessoryType = undefined;
    }
  }
  if (typeof body.gadgetType === "string") {
    update.gadgetType = body.gadgetType.trim().slice(0, FIELD_LIMITS.shortLabel);
  }
  if (body.imageUrl !== undefined) {
    const result = validateString(body.imageUrl, {
      label: "Image URL",
      max: PRODUCT_FIELD_LIMITS.imageUrl,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.imageUrl = result;
  }
  if (Array.isArray(body.galleryUrls)) {
    update.galleryUrls = toUnknownArray(body.galleryUrls)
      .filter((url): url is string => typeof url === "string" && url.length <= PRODUCT_FIELD_LIMITS.imageUrl);
  }
  if (body.releaseYear !== undefined) {
    const releaseYear = Number(body.releaseYear);
    if (
      !Number.isFinite(releaseYear) ||
      releaseYear < MIN_PRODUCT_RELEASE_YEAR ||
      releaseYear > MAX_PRODUCT_RELEASE_YEAR
    ) {
      return badRequest(
        `Release year must be between ${MIN_PRODUCT_RELEASE_YEAR} and ${MAX_PRODUCT_RELEASE_YEAR}.`,
      );
    }
    update.releaseYear = releaseYear;
  }
  if (Array.isArray(body.highlights)) {
    update.highlights = toUnknownArray(body.highlights)
      .filter((highlight): highlight is string => typeof highlight === "string")
      .map((highlight) => highlight.trim())
      .filter((highlight) => highlight.length > 0 && highlight.length <= FIELD_LIMITS.shortText)
      .slice(0, PRODUCT_FIELD_LIMITS.highlightCount);
  }
  if (body.isFeatured !== undefined) {
    update.isFeatured = Boolean(body.isFeatured);
  }
  if (body.isActive !== undefined) {
    update.isActive = Boolean(body.isActive);
  }
  if (body.isArchived !== undefined) {
    update.isArchived = Boolean(body.isArchived);
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  try {
    const doc = await Product.findByIdAndUpdate(id, { $set: update }, {
      new: true,
      runValidators: true,
    }).lean<ProductLean>();
    if (!doc) {
      return notFound("Product not found");
    }

    const brand = await Brand.findById(doc.brandId).lean<BrandLean>();

    await recordActivity({
      actor,
      action: update.isArchived === true ? "archived" : "updated",
      resourceType: "product",
      resourceId: id,
      resourceLabel: doc.modelName,
    });
    bustAdminCaches();
    return ok(toProductResponse(doc, brand ?? undefined));
  } catch (error) {
    return handleMongoError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("product_delete");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  // Hard delete is dangerous if any order references this product — order
  // history would render with broken links. Force admins to archive instead.
  const orderCount = await Order.countDocuments({ "items.productId": id });
  if (orderCount > 0) {
    return conflict(
      `Cannot delete a product referenced by ${orderCount} order${orderCount === 1 ? "" : "s"}. Archive it instead.`,
    );
  }

  try {
    const doc = await Product.findByIdAndDelete(id).lean<ProductLean>();
    if (!doc) {
      return notFound("Product not found");
    }

    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "product",
      resourceId: id,
      resourceLabel: doc.modelName,
    });
    bustAdminCaches();
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
