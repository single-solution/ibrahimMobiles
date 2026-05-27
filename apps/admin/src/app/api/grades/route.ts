import { requireSession } from "@/lib/api/requireSession";
import {
  badRequest,
  conflict,
  created,
  isValidationError,
  normalizeStructuredContent,
  ok,
  parseBody,
  slugify,
  validateString,
} from "@store/shared";
import { toGradeResponse, type GradeLean } from "@/lib/serializers/grade";
import { connectDB, Grade, handleMongoError } from "@store/db";

import { GRADE_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import { bustAdminCaches } from "@/lib/cached";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import { recordActivity } from "@/lib/services/activityLog";
import type { AdminGrade } from "@/types/admin";

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

async function hasGradeCategoryConflict(
  categorySlug: string,
  slug: string,
): Promise<boolean> {
  const existing = await Grade.exists({ categorySlug, slug });
  return Boolean(existing);
}

export async function GET(request: Request) {
  const { response } = await requireSession("product_view");
  if (response) {
    return response;
  }

  await connectDB();
  const { page, limit, skip, search, searchPattern } = readListOptions(request);
  const url = new URL(request.url);
  const categorySlug = url.searchParams.get("categorySlug");
  const filter: Record<string, unknown> = {};
  if (categorySlug) {
    filter.categorySlug = categorySlug;
  }
  if (search) {
    filter.$or = [
      { label: { $regex: searchPattern, $options: "i" } },
      { slug: { $regex: searchPattern, $options: "i" } },
    ];
  }
  const [docs, total] = await Promise.all([
    Grade.find(filter)
      .sort({ categorySlug: 1, label: 1 })
      .skip(skip)
      .limit(limit)
      .lean<GradeLean[]>(),
    Grade.countDocuments(filter),
  ]);
  const payload: ListResponse<AdminGrade> = {
    items: docs.map(toGradeResponse),
    total,
    page,
    limit,
  };
  return ok(payload);
}

interface GradeCreateInput {
  categorySlug?: unknown;
  label?: unknown;
  notes?: unknown;
  color?: unknown;
  video?: unknown;
  slug?: unknown;
  content?: unknown;
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
  const categorySlug = slugify(body.categorySlug, 64);

  await connectDB();
  if (await hasGradeCategoryConflict(categorySlug, slug)) {
    return conflict("A grade with this label already exists in this category.");
  }

  const content = normalizeStructuredContent(body.content, notesResult);

  try {
    const doc = await Grade.create({
      categorySlug,
      slug,
      label: labelResult,
      notes: content.summary || notesResult,
      color,
      video,
      content,
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
