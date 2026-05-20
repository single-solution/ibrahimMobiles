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
import { toGradeResponse, type GradeLean } from "@/lib/serializers/grade";
import { connectDB, Grade, handleMongoError } from "@store/db";

import { GRADE_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

export async function GET() {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  await connectDB();
  const docs = await Grade.find()
    .sort({ categorySlug: 1, label: 1 })
    .lean<GradeLean[]>();
  return ok({ items: docs.map(toGradeResponse) });
}

interface GradeCreateInput {
  categorySlug?: unknown;
  label?: unknown;
  notes?: unknown;
  color?: unknown;
  video?: unknown;
  slug?: unknown;
}

export async function POST(request: Request) {
  const { actor, response } = await requireSession("category_manage");
  if (response) {
    return response;
  }

  const body = await parseBody<GradeCreateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  if (typeof body.categorySlug !== "string" || body.categorySlug.trim().length === 0) {
    return badRequest("categorySlug is required.");
  }

  const labelResult = validateString(body.label, {
    label: "Label",
    max: GRADE_FIELD_LIMITS.label,
  });
  if (isValidationError(labelResult)) {
    return badRequest(labelResult.error);
  }
  const notesResult = validateString(body.notes, {
    label: "Notes",
    max: GRADE_FIELD_LIMITS.notes,
  });
  if (isValidationError(notesResult)) {
    return badRequest(notesResult.error);
  }
  const color =
    typeof body.color === "string" && HEX_COLOR_REGEX.test(body.color)
      ? body.color
      : "#1f2937";
  const video = typeof body.video === "string" ? body.video.trim() : "";

  const slug =
    typeof body.slug === "string" && body.slug.trim().length > 0
      ? slugify(body.slug, 64)
      : slugify(labelResult, 64);
  if (slug.length === 0) {
    return badRequest("Slug could not be derived from label.");
  }

  await connectDB();
  try {
    const doc = await Grade.create({
      categorySlug: slugify(body.categorySlug, 64),
      slug,
      label: labelResult,
      notes: notesResult,
      color,
      video,
    });
    await recordActivity({
      actor,
      action: "created",
      resourceType: "grade",
      resourceId: doc._id.toString(),
      resourceLabel: doc.label,
    });
    bustAdminCaches();
    return created(toGradeResponse(doc.toObject() as unknown as GradeLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
