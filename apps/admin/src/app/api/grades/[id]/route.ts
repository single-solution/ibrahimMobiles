import { requireSession } from "@/lib/api/requireSession";
import {
  badRequest,
  isValidationError,
  isValidId,
  notFound,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import {
  connectDB,
  Grade,
  GRADE_TONES,
  handleMongoError,
} from "@store/db";

import { recordActivity } from "@/lib/services/activityLog";

import { GRADE_FIELD_LIMITS } from "@/lib/api/fieldLimits";

import { toGradeResponse, type GradeLean } from "@/lib/serializers/grade";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface GradeUpdateInput {
  label?: unknown;
  shortLabel?: unknown;
  description?: unknown;
  cosmeticNotes?: unknown;
  functionalNotes?: unknown;
  tone?: unknown;
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

  const body = await parseBody<GradeUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const update: Record<string, unknown> = {};

  if (body.label !== undefined) {
    const result = validateString(body.label, { label: "Label", max: GRADE_FIELD_LIMITS.label });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.label = result;
  }
  if (body.shortLabel !== undefined) {
    const result = validateString(body.shortLabel, { label: "Short label", max: GRADE_FIELD_LIMITS.shortLabel });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.shortLabel = result;
  }
  if (body.description !== undefined) {
    const result = validateString(body.description, { label: "Description", max: GRADE_FIELD_LIMITS.description });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.description = result;
  }
  if (body.cosmeticNotes !== undefined) {
    const result = validateString(body.cosmeticNotes, { label: "Cosmetic notes", max: GRADE_FIELD_LIMITS.cosmeticNotes });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.cosmeticNotes = result;
  }
  if (body.functionalNotes !== undefined) {
    const result = validateString(body.functionalNotes, { label: "Functional notes", max: GRADE_FIELD_LIMITS.functionalNotes });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.functionalNotes = result;
  }
  if (typeof body.tone === "string") {
    const allowed = new Set<string>(GRADE_TONES);
    if (!allowed.has(body.tone)) {
      return badRequest(`Tone must be one of: ${GRADE_TONES.join(", ")}`);
    }
    update.tone = body.tone;
  }
  if (typeof body.sortOrder === "number") {
    update.sortOrder = body.sortOrder;
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  try {
    const doc = await Grade.findByIdAndUpdate(id, { $set: update }, {
      new: true,
      runValidators: true,
    }).lean<GradeLean>();
    if (!doc) {
      return notFound("Grade not found");
    }

    await recordActivity({
      actor,
      action: "updated",
      resourceType: "grade",
      resourceId: id,
      resourceLabel: doc.label,
    });
    return ok(toGradeResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}
