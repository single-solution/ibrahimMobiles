/**
 * Admin upload endpoint.
 *
 * - `kind=image` (default): runs `processImage` to generate the four
 *   WebP variants + blurhash and returns a fully-formed `StoredImage`.
 * - `kind=video`: bypasses image processing and stores the original
 *   file directly. Returns `{ url, contentType, sizeBytes }` so the
 *   caller can persist a `Grade.video` URL.
 *
 * Multipart form fields:
 *   - `file`        — required, single file payload
 *   - `kind`        — "image" | "video" (default "image")
 *   - `altTextBase` — optional base alt text for images
 *   - `subjectKind` — short label used in the storage key (e.g.
 *                     "products", "categories", "offers")
 *   - `subjectId`   — optional id for the storage key prefix
 */

import { NextResponse } from "next/server";
import { logger, resolveStorageProvider } from "@store/shared";

import { requireSession } from "@/lib/api/requireSession";
import {
  ALLOWED_IMAGE_MIME,
  ALLOWED_VIDEO_MIME,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_MB,
  type AllowedImageMime,
  type AllowedVideoMime,
} from "@/lib/uploads/limits";
import {
  processImage,
  UploadValidationError,
} from "@/lib/uploads/processImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeSegment(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned.length > 0 ? cleaned : null;
}

function buildKeyPrefix(subjectKind: string | null, subjectId: string | null): string {
  const segments: string[] = [];
  segments.push(sanitizeSegment(subjectKind) ?? "uploads");
  if (subjectId) {
    const cleanedId = sanitizeSegment(subjectId);
    if (cleanedId) segments.push(cleanedId);
  }
  segments.push(todayIsoDate());
  return segments.join("/");
}

export async function POST(request: Request): Promise<NextResponse> {
  const { actor, response } = await requireSession("media_upload");
  if (response) return response;
  const userId = actor.id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data body." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing `file` field in multipart form data." },
      { status: 400 },
    );
  }

  const kindRaw = (formData.get("kind") ?? "image").toString().toLowerCase();
  const kind = kindRaw === "video" ? "video" : "image";

  const subjectKind = formData.get("subjectKind")?.toString() ?? null;
  const subjectId = formData.get("subjectId")?.toString() ?? null;
  const altTextBase = formData.get("altTextBase")?.toString().trim() ?? "";
  const fileType = file.type;
  const fileSize = file.size;

  try {
    if (kind === "image") {
      if (
        !ALLOWED_IMAGE_MIME.includes(fileType as AllowedImageMime)
      ) {
        return NextResponse.json(
          {
            error: `Unsupported image type "${fileType}". Allowed: ${ALLOWED_IMAGE_MIME.join(", ")}.`,
          },
          { status: 415 },
        );
      }
      if (fileSize > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `Image exceeds ${MAX_IMAGE_MB} MB.` },
          { status: 413 },
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const storage = resolveStorageProvider();
      const keyPrefix = buildKeyPrefix(subjectKind, subjectId);
      const stored = await processImage({
        buffer,
        keyPrefix,
        alt: altTextBase || file.name.replace(/\.[^.]+$/, ""),
        storage,
      });
      logger.info(
        {
          userId,
          subjectKind,
          subjectId,
          width: stored.width,
          height: stored.height,
        },
        "uploads: image stored",
      );
      return NextResponse.json(stored, { status: 200 });
    }

    if (
      !ALLOWED_VIDEO_MIME.includes(fileType as AllowedVideoMime)
    ) {
      return NextResponse.json(
        {
          error: `Unsupported video type "${fileType}". Allowed: ${ALLOWED_VIDEO_MIME.join(", ")}.`,
        },
        { status: 415 },
      );
    }
    if (fileSize > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: `Video exceeds ${MAX_VIDEO_MB} MB.` },
        { status: 413 },
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storage = resolveStorageProvider();
    const keyPrefix = buildKeyPrefix(subjectKind, subjectId);
    const extension = fileType === "video/webm" ? "webm" : "mp4";
    const key = `${keyPrefix}/video-${Date.now().toString(36)}.${extension}`;
    const url = await storage.put(key, buffer, fileType);
    logger.info(
      { userId, subjectKind, subjectId, sizeBytes: buffer.length },
      "uploads: video stored",
    );
    return NextResponse.json(
      { url, contentType: fileType, sizeBytes: buffer.length },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(
      { error, userId, kind, subjectKind, subjectId },
      "uploads: processing failed",
    );
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
