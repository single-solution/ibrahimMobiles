import { requireSession } from "@/lib/api/requireSession";
import {
  badRequest,
  FIELD_LIMITS,
  isValidationError,
  isValidId,
  notFound,
  ok,
  parseBody,
  toUnknownArray,
  validateString,
} from "@store/shared";

import {
  Category,
  CONDITION_GRADES,
  connectDB,
  handleMongoError,
} from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";

import { CATEGORY_FIELD_LIMITS } from "@/lib/api/fieldLimits";

import { toCategoryResponse, type CategoryLean } from "@/lib/serializers/category";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const TAGLINE_MAX_CHARS = CATEGORY_FIELD_LIMITS.tagline;
const TRUST_CHIPS_MAX_COUNT = CATEGORY_FIELD_LIMITS.trustChipCount;

interface CategoryUpdateInput {
  label?: unknown;
  pluralLabel?: unknown;
  isActive?: unknown;
  tagline?: unknown;
  applicableGrades?: unknown;
  trustChips?: unknown;
  emptyHint?: unknown;
  sortOrder?: unknown;
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
      max: FIELD_LIMITS.shortLabel,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.label = result;
  }
  if (body.pluralLabel !== undefined) {
    const result = validateString(body.pluralLabel, {
      label: "Plural label",
      max: FIELD_LIMITS.shortLabel,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.pluralLabel = result;
  }
  if (body.tagline !== undefined) {
    const result = validateString(body.tagline, { label: "Tagline", max: TAGLINE_MAX_CHARS });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.tagline = result;
  }
  if (body.emptyHint !== undefined) {
    const result = validateString(body.emptyHint, {
      label: "Empty hint",
      max: TAGLINE_MAX_CHARS,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.emptyHint = result;
  }
  if (body.isActive !== undefined) {
    update.isActive = Boolean(body.isActive);
  }
  if (Array.isArray(body.applicableGrades)) {
    const allowed = new Set<string>(CONDITION_GRADES);
    update.applicableGrades = toUnknownArray(body.applicableGrades)
      .filter((grade): grade is string => typeof grade === "string" && allowed.has(grade));
  }
  if (Array.isArray(body.trustChips)) {
    update.trustChips = toUnknownArray(body.trustChips)
      .filter((chip): chip is string => typeof chip === "string")
      .map((chip) => chip.trim())
      .filter((chip) => chip.length > 0 && chip.length <= FIELD_LIMITS.shortLabel)
      .slice(0, TRUST_CHIPS_MAX_COUNT);
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
