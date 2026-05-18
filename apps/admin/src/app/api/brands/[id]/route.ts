import {
  Brand,
  connectDB,
  handleMongoError,
  Product,
} from "@store/db";
import {
  badRequest,
  conflict,
  isValidId,
  isValidationError,
  noContent,
  notFound,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import { requireSession } from "@/lib/api/requireSession";
import { bustAdminCaches } from "@/lib/cached";
import { toBrandResponse, type BrandLean } from "@/lib/serializers/brand";
import { recordActivity } from "@/lib/services/activityLog";
import { slugify } from "@/lib/services/slug";
import { BRAND_FIELD_LIMITS } from "@/lib/api/fieldLimits";

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
  const doc = await Brand.findById(id).lean<BrandLean>();
  if (!doc) {
    return notFound("Brand not found");
  }

  return ok(toBrandResponse(doc));
}

interface BrandUpdateInput {
  name?: unknown;
  tagline?: unknown;
  slug?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("brand_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<BrandUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const update: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const result = validateString(body.name, { label: "Name", max: BRAND_FIELD_LIMITS.name });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.name = result;
  }
  if (body.tagline !== undefined) {
    const result = validateString(body.tagline, { label: "Tagline", max: BRAND_FIELD_LIMITS.tagline });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.tagline = result;
  }
  if (body.slug !== undefined && typeof body.slug === "string") {
    const slug = slugify(body.slug);
    if (slug.length === 0) {
      return badRequest("Slug cannot be empty.");
    }
    update.slug = slug;
  }
  if (body.isActive !== undefined) {
    update.isActive = Boolean(body.isActive);
  }
  if (typeof body.sortOrder === "number") {
    update.sortOrder = body.sortOrder;
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  try {
    const doc = await Brand.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean<BrandLean>();
    if (!doc) {
      return notFound("Brand not found");
    }

    await recordActivity({
      actor,
      action: "updated",
      resourceType: "brand",
      resourceId: id,
      resourceLabel: doc.name,
    });
    bustAdminCaches();
    return ok(toBrandResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("brand_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  // Referential integrity: a brand with products attached can't be hard-deleted
  // — toggle `isActive` to hide it instead.
  const productCount = await Product.countDocuments({ brandId: id });
  if (productCount > 0) {
    return conflict(
      `Cannot delete a brand with ${productCount} product${productCount === 1 ? "" : "s"}. Mark it inactive instead.`,
    );
  }

  try {
    const doc = await Brand.findByIdAndDelete(id).lean<BrandLean>();
    if (!doc) {
      return notFound("Brand not found");
    }

    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "brand",
      resourceId: id,
      resourceLabel: doc.name,
    });
    bustAdminCaches();
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
