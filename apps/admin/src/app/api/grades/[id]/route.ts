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

import { connectDB, Grade, handleMongoError } from "@store/db";

import { recordActivity } from "@/lib/services/activityLog";

import { GRADE_FIELD_LIMITS } from "@/lib/api/fieldLimits";

import { toGradeResponse, type GradeLean } from "@/lib/serializers/grade";

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Patch surface for an existing grade. `categorySlug` is intentionally
 * read-only (the URL identifies the grade, and re-parenting a grade is
 * a destructive op better expressed as delete + create).
 */
interface GradeUpdateInput {
  label?: unknown;
  notes?: unknown;
  color?: unknown;
  video?: unknown;
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
    const result = validateString(body.label, {
      label: "Label",
      max: GRADE_FIELD_LIMITS.label,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.label = result;
  }
  if (body.notes !== undefined) {
    const result = validateString(body.notes, {
      label: "Notes",
      max: GRADE_FIELD_LIMITS.notes,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.notes = result;
  }
  if (body.color !== undefined) {
    if (typeof body.color !== "string" || !HEX_COLOR_REGEX.test(body.color)) {
      return badRequest("Color must be a #RRGGBB hex value.");
    }
    update.color = body.color;
  }
  if (body.video !== undefined) {
    if (typeof body.video !== "string") {
      return badRequest("Video must be a URL string.");
    }
    update.video = body.video.trim();
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  try {
    const doc = await Grade.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    ).lean<GradeLean>();
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
