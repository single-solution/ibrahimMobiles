import { requireSession } from "@/lib/api/requireSession";
import {
  badRequest,
  conflict,
  isValidationError,
  isValidId,
  noContent,
  notFound,
  ok,
  parseBody,
  slugify,
  validateString,
} from "@store/shared";

import {
  Attribute,
  Brand,
  Category,
  connectDB,
  Grade,
  handleMongoError,
  Product,
} from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";

import { CATEGORY_FIELD_LIMITS } from "@/lib/api/fieldLimits";

import {
  toCategoryResponse,
  type CategoryLean,
} from "@/lib/serializers/category";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface CategoryUpdateInput {
  label?: unknown;
  description?: unknown;
  slug?: unknown;
  iconKind?: unknown;
  iconEmoji?: unknown;
  iconImage?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
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
  const doc = await Category.findById(id).lean<CategoryLean>();
  if (!doc) {
    return notFound("Category not found");
  }
  return ok(toCategoryResponse(doc));
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("category_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<CategoryUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const update: Record<string, unknown> = {};

  if (body.label !== undefined) {
    const result = validateString(body.label, {
      label: "Label",
      max: CATEGORY_FIELD_LIMITS.label,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.label = result;
  }
  if (body.description !== undefined) {
    const result = validateString(body.description, {
      label: "Description",
      max: CATEGORY_FIELD_LIMITS.description,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.description = result;
  }
  if (body.slug !== undefined && typeof body.slug === "string") {
    const slug = slugify(body.slug);
    if (slug.length === 0) {
      return badRequest("Slug cannot be empty.");
    }
    update.slug = slug;
  }
  if (body.iconKind !== undefined) {
    if (body.iconKind !== "emoji" && body.iconKind !== "image") {
      return badRequest("iconKind must be 'emoji' or 'image'.");
    }
    update.iconKind = body.iconKind;
  }
  if (body.iconEmoji !== undefined) {
    if (typeof body.iconEmoji !== "string") {
      return badRequest("iconEmoji must be a string.");
    }
    update.iconEmoji = body.iconEmoji;
  }
  if (body.iconImage !== undefined) {
    if (body.iconImage !== null && typeof body.iconImage !== "object") {
      return badRequest("iconImage must be a StoredImage payload or null.");
    }
    update.iconImage = body.iconImage;
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
    const doc = await Category.findByIdAndUpdate(id, { $set: update }, {
      new: true,
      runValidators: true,
    }).lean<CategoryLean>();
    if (!doc) {
      return notFound("Category not found");
    }

    await recordActivity({
      actor,
      action: "updated",
      resourceType: "category",
      resourceId: id,
      resourceLabel: doc.label,
    });
    bustAdminCaches();
    return ok(toCategoryResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("category_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  // Look up by slug — that's how every dependent doc references this row.
  const doc = await Category.findById(id).select("slug label").lean<{
    slug: string;
    label: string;
  }>();
  if (!doc) {
    return notFound("Category not found");
  }

  // Block delete when anything still references this category.
  const [productCount, brandCount, gradeCount, attributeCount] = await Promise.all([
    Product.countDocuments({ categorySlug: doc.slug }),
    Brand.countDocuments({ categorySlugs: doc.slug }),
    Grade.countDocuments({ categorySlug: doc.slug }),
    Attribute.countDocuments({ categorySlug: doc.slug }),
  ]);

  const blockingCounts = { productCount, brandCount, gradeCount, attributeCount };
  const total =
    productCount + brandCount + gradeCount + attributeCount;
  if (total > 0) {
    return conflict(
      `Cannot delete a category with ${total} dependent records. Toggle isActive instead. (${JSON.stringify(blockingCounts)})`,
    );
  }

  try {
    await Category.deleteOne({ _id: id });
    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "category",
      resourceId: id,
      resourceLabel: doc.label,
    });
    bustAdminCaches();
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
