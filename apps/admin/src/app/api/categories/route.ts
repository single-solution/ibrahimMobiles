import { requireSession } from "@/lib/api/requireSession";
import {
  badRequest,
  created,
  isValidationError,
  ok,
  parseBody,
  slugify,
  validateString,
} from "@store/shared";
import { Category, connectDB, handleMongoError } from "@store/db";

import { CATEGORY_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";
import {
  toCategoryResponse,
  type CategoryLean,
} from "@/lib/serializers/category";

export async function GET() {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  await connectDB();
  const docs = await Category.find()
    .sort({ sortOrder: 1, label: 1 })
    .lean<CategoryLean[]>();
  return ok({ items: docs.map(toCategoryResponse) });
}

interface CategoryCreateInput {
  label?: unknown;
  description?: unknown;
  slug?: unknown;
  iconKind?: unknown;
  iconEmoji?: unknown;
  iconImage?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
}

export async function POST(request: Request) {
  const { actor, response } = await requireSession("category_manage");
  if (response) {
    return response;
  }

  const body = await parseBody<CategoryCreateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const labelResult = validateString(body.label, {
    label: "Label",
    max: CATEGORY_FIELD_LIMITS.label,
  });
  if (isValidationError(labelResult)) {
    return badRequest(labelResult.error);
  }

  const descriptionResult = validateString(body.description, {
    label: "Description",
    max: CATEGORY_FIELD_LIMITS.description,
  });
  if (isValidationError(descriptionResult)) {
    return badRequest(descriptionResult.error);
  }

  const slug =
    typeof body.slug === "string" && body.slug.trim().length > 0
      ? slugify(body.slug)
      : slugify(labelResult);
  if (slug.length === 0) {
    return badRequest("Slug could not be derived from label.");
  }

  // Icon — exactly one of `iconEmoji` or `iconImage` (StoredImage payload).
  const iconKind = body.iconKind === "image" ? "image" : "emoji";
  if (iconKind === "emoji") {
    if (typeof body.iconEmoji !== "string" || body.iconEmoji.length === 0) {
      return badRequest("Emoji is required when iconKind is 'emoji'.");
    }
  } else {
    if (
      body.iconImage === null ||
      typeof body.iconImage !== "object" ||
      body.iconImage === undefined
    ) {
      return badRequest("iconImage is required when iconKind is 'image'.");
    }
  }

  await connectDB();
  try {
    const payload: Record<string, unknown> = {
      slug,
      label: labelResult,
      description: descriptionResult,
      iconKind,
      isActive: body.isActive !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    };
    if (iconKind === "emoji") {
      payload.iconEmoji = body.iconEmoji;
    } else {
      payload.iconImage = body.iconImage;
    }
    const doc = await Category.create(payload);

    await recordActivity({
      actor,
      action: "created",
      resourceType: "category",
      resourceId: doc._id.toString(),
      resourceLabel: doc.label,
    });
    bustAdminCaches();
    return created(toCategoryResponse(doc.toObject() as unknown as CategoryLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
