/**
 * POST /api/inquiries/[id]/attachments
 *
 * Admin attaches an image or file to a chat reply. Behaves like the
 * regular reply endpoint (auto-claim, status flip, counters) but the
 * message also carries one attachment. Gated by `inquiry_manage`.
 */

import { NextResponse } from "next/server";

import { Inquiry, connectDB } from "@store/db";
import {
  logger,
  resolveStorageProvider,
} from "@store/shared";

import { inquiryStatusPatchAfterMessage } from "@store/shared";

import { requireSession } from "@/lib/api/requireSession";
import { recordActivity } from "@/lib/services/activityLog";
import {
  toInquiryResponse,
  type InquiryLean,
} from "@/lib/serializers/inquiry";
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_MB,
} from "@/lib/uploads/limits";
import {
  processImage,
  UploadValidationError,
} from "@/lib/uploads/processImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FILE_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
] as const;

interface RouteContext {
  params: Promise<{ id: string }>;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("inquiry_manage");
  if (response) return response;

  const { id } = await params;

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

  const body = formData.get("body")?.toString().trim() ?? "";
  const fileType = file.type;
  const isImage = (ALLOWED_IMAGE_MIME as readonly string[]).includes(fileType);
  const isFile = (ALLOWED_FILE_MIME as readonly string[]).includes(fileType);

  if (!isImage && !isFile) {
    return NextResponse.json(
      { error: `Unsupported type "${fileType}".` },
      { status: 415 },
    );
  }

  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds ${MAX_IMAGE_MB} MB.` },
      { status: 413 },
    );
  }
  if (isFile && file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_VIDEO_MB} MB.` },
      { status: 413 },
    );
  }

  await connectDB();
  const existing = await Inquiry.findById(id).lean<InquiryLean>();
  if (!existing) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storage = resolveStorageProvider();
    const keyPrefix = `chat/${existing._id.toString()}/${todayIsoDate()}`;

    const previewBody = body || (isImage ? "(image)" : `(${file.name})`);
    const now = new Date();
    let attachment;
    if (isImage) {
      const stored = await processImage({
        buffer,
        keyPrefix,
        alt: body || file.name.replace(/\.[^.]+$/, ""),
        storage,
      });
      attachment = { kind: "image" as const, image: stored };
    } else {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200);
      const key = `${keyPrefix}/file-${Date.now().toString(36)}-${safeName}`;
      const url = await storage.put(key, buffer, fileType);
      attachment = {
        kind: "file" as const,
        url,
        mime: fileType,
        sizeBytes: buffer.length,
        filename: file.name.slice(0, 240),
      };
    }

    await Inquiry.updateOne(
      { _id: existing._id },
      {
        $push: {
          messages: {
            author: "agent",
            authorName: actor.name,
            authorUserId: actor.id,
            body: body || (isImage ? "📷" : "📎"),
            attachments: [attachment],
            createdAt: now,
          },
        },
        $set: {
          lastMessageAt: now,
          lastMessagePreview: previewBody.slice(0, 280),
          lastMessageAuthor: "agent",
          unreadByTeam: 0,
          ...inquiryStatusPatchAfterMessage(existing.status, "team"),
          ...(existing.assignedToUserId ? {} : { assignedToUserId: actor.id }),
        },
        $inc: { unreadByCustomer: 1 },
      },
    );

    const refreshed = await Inquiry.findById(existing._id).lean<InquiryLean>();
    if (!refreshed) {
      return NextResponse.json({ error: "Inquiry vanished" }, { status: 500 });
    }
    const label = refreshed.subjectProductName
      ? `${refreshed.customerName} · ${refreshed.subjectProductName}`
      : refreshed.customerName;
    await recordActivity({
      actor,
      action: "updated",
      resourceType: "inquiry",
      resourceId: id,
      resourceLabel: label,
      detail: "Sent attachment",
    });
    return NextResponse.json(
      toInquiryResponse(refreshed, { includeInternal: true }),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error({ error, inquiryId: id }, "Failed to attach admin upload");
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
