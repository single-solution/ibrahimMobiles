import { connectDB, handleMongoError, MediaAsset } from "@store/db";
import {
  badRequest,
  FIELD_LIMITS,
  isValidId,
  isValidationError,
  noContent,
  notFound,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import { requireSession } from "@/lib/api/requireSession";
import { toMediaAssetResponse, type MediaAssetLean } from "@/lib/serializers/mediaAsset";
import { recordActivity } from "@/lib/services/activityLog";

const MEDIA_TAGS_MAX_COUNT = 24;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { response } = await requireSession("media_view");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  const doc = await MediaAsset.findById(id).lean<MediaAssetLean>();
  if (!doc) {
    return notFound("Media asset not found");
  }

  return ok(toMediaAssetResponse(doc));
}

interface MediaUpdateInput {
  title?: unknown;
  alt?: unknown;
  tags?: unknown;
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("media_upload");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<MediaUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const update: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const result = validateString(body.title, {
      label: "Title",
      max: FIELD_LIMITS.mediumText,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.title = result;
  }
  if (body.alt !== undefined) {
    update.alt = typeof body.alt === "string" ? body.alt.trim() : undefined;
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return badRequest("Tags must be an array of strings.");
    }
    update.tags = body.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, MEDIA_TAGS_MAX_COUNT);
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  try {
    const doc = await MediaAsset.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    ).lean<MediaAssetLean>();
    if (!doc) {
      return notFound("Media asset not found");
    }

    await recordActivity({
      actor,
      action: "updated",
      resourceType: "media",
      resourceId: id,
      resourceLabel: doc.title,
    });
    return ok(toMediaAssetResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("media_delete");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  try {
    const doc = await MediaAsset.findByIdAndDelete(id).lean<MediaAssetLean>();
    if (!doc) {
      return notFound("Media asset not found");
    }

    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "media",
      resourceId: id,
      resourceLabel: doc.title,
    });
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
