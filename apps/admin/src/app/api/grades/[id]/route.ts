import { requireSession } from "@/lib/api/requireSession";
import {
  badRequest,
  conflict,
  isValidationError,
  isValidId,
  noContent,
  normalizeStructuredContent,
  notFound,
  ok,
  parseBody,
  slugify,
  validateString,
} from "@store/shared";

import { connectDB, Grade, handleMongoError } from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";

import { GRADE_FIELD_LIMITS } from "@/lib/api/fieldLimits";

import { toGradeResponse, type GradeLean } from "@/lib/serializers/grade";
import {
  cascadeGradeSlugChange,
  slugFromCatalogLabel,
} from "@/lib/services/catalogSlugSync";

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

async function hasGradeSlugConflict(
  id: string,
  categorySlug: string,
  slug: string,
): Promise<boolean> {
  const existing = await Grade.exists({
    _id: { $ne: id },
    categorySlug,
    slug,
  });
  return Boolean(existing);
}

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
  content?: unknown;
  isActive?: unknown;
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
  if (body.content !== undefined) {
    const fallbackSummary =
      typeof update.notes === "string"
        ? (update.notes as string)
        : typeof body.notes === "string"
          ? body.notes
          : "";
    const content = normalizeStructuredContent(body.content, fallbackSummary);
    update.content = content;
    if (content.summary) {
      update.notes = content.summary.slice(0, GRADE_FIELD_LIMITS.notes);
    }
  }
  if (body.isActive !== undefined) {
    update.isActive = Boolean(body.isActive);
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  try {
    const current = await Grade.findById(id)
      .select("categorySlug slug label")
      .lean<{ categorySlug: string; slug: string; label: string }>();
    if (!current) {
      return notFound("Grade not found");
    }

    if (typeof update.label === "string") {
      const nextSlug = slugFromCatalogLabel(update.label, 64);
      if (await hasGradeSlugConflict(id, current.categorySlug, nextSlug)) {
        return conflict("A grade with this slug already exists in this category.");
      }
      update.slug = nextSlug;
    }

    const doc = await Grade.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    ).lean<GradeLean>();
    if (!doc) {
      return notFound("Grade not found");
    }

    if (typeof update.slug === "string" && update.slug !== current.slug) {
      await cascadeGradeSlugChange(
        current.categorySlug,
        current.slug,
        update.slug as string,
      );
    }

    await recordActivity({
      actor,
      action: "updated",
      resourceType: "grade",
      resourceId: id,
      resourceLabel: doc.label,
    });
    bustAdminCaches();
    return ok(toGradeResponse(doc));
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
  try {
    const doc = await Grade.findByIdAndDelete(id).lean<GradeLean>();
    if (!doc) {
      return notFound("Grade not found");
    }
    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "grade",
      resourceId: id,
      resourceLabel: doc.label,
    });
    bustAdminCaches();
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
