import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import {
  badRequest,
  created,
  FIELD_LIMITS,
  isValidationError,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import {
  connectDB,
  handleMongoError,
  MEDIA_KINDS,
  MediaAsset,
  type MediaKind,
} from "@store/db";

import { recordActivity } from "@/lib/services/activityLog";

import { toMediaAssetResponse, type MediaAssetLean } from "@/lib/serializers/mediaAsset";
import type { AdminMediaAsset } from "@/types/admin";

export async function GET(request: Request) {
  const { response } = await requireSession("media_view");
  if (response) {
    return response;
  }

  await connectDB();
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const tag = url.searchParams.get("tag");
  const { page, limit, skip, search, searchPattern } = readListOptions(request);

  const filter: Record<string, unknown> = {};
  if (kind && (MEDIA_KINDS as readonly string[]).includes(kind)) {
    filter.kind = kind;
  }
  if (tag) {
    filter.tags = tag;
  }
  if (search) {
    filter.$or = [
      { title: { $regex: searchPattern, $options: "i" } },
      { fileName: { $regex: searchPattern, $options: "i" } },
      { tags: { $regex: searchPattern, $options: "i" } },
    ];
  }

  const [docs, total] = await Promise.all([
    MediaAsset.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<MediaAssetLean[]>(),
    MediaAsset.countDocuments(filter),
  ]);

  const payload: ListResponse<AdminMediaAsset> = {
    items: docs.map(toMediaAssetResponse),
    total,
    page,
    limit,
  };
  return ok(payload);
}

const MEDIA_TAGS_MAX_COUNT = 24;

interface MediaInput {
  url?: unknown;
  kind?: unknown;
  title?: unknown;
  alt?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  width?: unknown;
  height?: unknown;
  tags?: unknown;
}

function parseKind(value: unknown): MediaKind {
  if (typeof value === "string" && (MEDIA_KINDS as readonly string[]).includes(value)) {
    return value as MediaKind;
  }
  return "image";
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, MEDIA_TAGS_MAX_COUNT);
}

export async function POST(request: Request) {
  const { actor, response } = await requireSession("media_upload");
  if (response) {
    return response;
  }

  const body = await parseBody<MediaInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const urlResult = validateString(body.url, { label: "URL", max: FIELD_LIMITS.mediaUrl });
  if (isValidationError(urlResult)) {
    return badRequest(urlResult.error);
  }

  try {
    new URL(urlResult);
  } catch {
    return badRequest("URL must be a valid absolute URL.");
  }

  const titleResult = validateString(body.title, {
    label: "Title",
    max: FIELD_LIMITS.mediumText,
  });
  if (isValidationError(titleResult)) {
    return badRequest(titleResult.error);
  }

  await connectDB();
  try {
    const doc = await MediaAsset.create({
      url: urlResult,
      kind: parseKind(body.kind),
      title: titleResult,
      alt: typeof body.alt === "string" ? body.alt.trim() : undefined,
      fileName: typeof body.fileName === "string" ? body.fileName.trim() : undefined,
      contentType: typeof body.contentType === "string" ? body.contentType.trim() : undefined,
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : undefined,
      width: typeof body.width === "number" ? body.width : undefined,
      height: typeof body.height === "number" ? body.height : undefined,
      tags: parseTags(body.tags),
      uploadedBy: actor.id,
    });
    await recordActivity({
      actor,
      action: "created",
      resourceType: "media",
      resourceId: doc._id.toString(),
      resourceLabel: doc.title,
    });
    return created(toMediaAssetResponse(doc.toObject() as MediaAssetLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
