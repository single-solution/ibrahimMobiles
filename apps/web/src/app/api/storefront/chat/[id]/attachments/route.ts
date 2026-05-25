/**
 * POST /api/storefront/chat/[id]/attachments
 *
 * Customer uploads an image or file as a chat message attachment.
 * Gated by `chat.attachmentsEnabled` AND `resolveChatAccess`. Same
 * thread-status side effects as a text message: thread reopens if
 * resolved, `unreadByTeam` increments, status remains "open".
 *
 * Body: multipart/form-data
 *   - file: required, image (WebP/JPEG/PNG ≤ 8MB) OR file ≤ 10MB.
 *   - body: optional, text accompanying the attachment.
 *
 * On success returns the refreshed `ChatThread` so the widget can
 * replace the optimistic stub.
 */

import { NextResponse } from "next/server";

import { Inquiry, connectDB } from "@store/db";
import {
  logger,
  resolveStorageProvider,
  SHORT_BURST_WINDOW_MS,
  guestChatLoginRequired,
} from "@store/shared";

import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";
import { auth } from "@/lib/auth";
import { inquiryStatusPatchAfterMessage } from "@store/shared";

import { resolveChatAccess } from "@/lib/chat/access";
import { claimAnonymousThreadIfNeeded } from "@/lib/chat/claimAnonymousThread";
import { getChatSettings } from "@/lib/chat/chatSettings";
import { toStorefrontThread, type InquiryLean } from "@/lib/chat/serializer";
import {
  ALLOWED_FILE_MIME,
  ALLOWED_IMAGE_MIME,
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
} from "@/lib/uploads/limits";
import {
  processImage,
  UploadValidationError,
} from "@/lib/uploads/processImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MAX_PER_WINDOW = 10;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request, { params }: RouteContext) {
  const settings = await getChatSettings();
  if (!settings.enabled) {
    return NextResponse.json({ error: "Chat is disabled." }, { status: 400 });
  }
  if (!settings.attachmentsEnabled) {
    return NextResponse.json(
      { error: "Attachments are disabled." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const access = await resolveChatAccess(id);
  if (access instanceof Response) return access;

  const session = await auth();
  let inquiry = access.inquiry;
  if (session?.user?.role === "customer" && session.user.customerId) {
    inquiry = await claimAnonymousThreadIfNeeded(
      inquiry,
      session.user.customerId,
    );
  }

  if (
    guestChatLoginRequired({
      customerId: inquiry.customerId?.toString(),
      phoneNumber: inquiry.phoneNumber,
      messages: inquiry.messages,
    })
  ) {
    return NextResponse.json(
      {
        error: "Sign in to keep chatting — you've used your free preview messages.",
        code: "login_required",
      },
      { status: 403 },
    );
  }

  const limited = enforcePublicRateLimit(request, {
    scope: "chat-attachment",
    identifier: inquiry.phoneNumber,
    max: MAX_PER_WINDOW,
    windowMs: SHORT_BURST_WINDOW_MS,
  });
  if (limited) return limited;

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

  const accompanyingBody = formData.get("body")?.toString().trim() ?? "";
  const fileType = file.type;
  const isImage = (ALLOWED_IMAGE_MIME as readonly string[]).includes(fileType);
  const isFile = (ALLOWED_FILE_MIME as readonly string[]).includes(fileType);

  if (!isImage && !isFile) {
    return NextResponse.json(
      {
        error: `Unsupported type "${fileType}". Allowed images: ${ALLOWED_IMAGE_MIME.join(
          ", ",
        )}. Allowed files: ${ALLOWED_FILE_MIME.join(", ")}.`,
      },
      { status: 415 },
    );
  }

  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds ${MAX_IMAGE_MB} MB.` },
      { status: 413 },
    );
  }
  if (isFile && file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_FILE_MB} MB.` },
      { status: 413 },
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storage = resolveStorageProvider();
    const keyPrefix = `chat/${inquiry._id.toString()}/${todayIsoDate()}`;

    const previewBody = accompanyingBody || (isImage ? "(image)" : `(${file.name})`);
    const now = new Date();
    let pushed:
      | {
          attachment:
            | {
                kind: "image";
                image: import("@store/shared").StoredImage;
              }
            | {
                kind: "file";
                url: string;
                mime: string;
                sizeBytes: number;
                filename: string;
              };
        }
      | null = null;

    if (isImage) {
      const stored = await processImage({
        buffer,
        keyPrefix,
        alt: accompanyingBody || file.name.replace(/\.[^.]+$/, ""),
        storage,
      });
      pushed = { attachment: { kind: "image", image: stored } };
    } else {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200);
      const key = `${keyPrefix}/file-${Date.now().toString(36)}-${safeName}`;
      const url = await storage.put(key, buffer, fileType);
      pushed = {
        attachment: {
          kind: "file",
          url,
          mime: fileType,
          sizeBytes: buffer.length,
          filename: file.name.slice(0, 240),
        },
      };
    }

    await connectDB();
    await Inquiry.updateOne(
      { _id: inquiry._id },
      {
        $push: {
          messages: {
            author: "customer",
            authorName: inquiry.customerName,
            body: accompanyingBody || (isImage ? "📷" : "📎"),
            attachments: [pushed.attachment],
            createdAt: now,
          },
        },
        $set: {
          lastMessageAt: now,
          lastMessagePreview: previewBody.slice(0, 280),
          lastMessageAuthor: "customer",
          unreadByCustomer: 0,
          ...inquiryStatusPatchAfterMessage(inquiry.status, "customer"),
        },
        $inc: { unreadByTeam: 1 },
      },
    );

    const refreshed = await Inquiry.findById(inquiry._id).lean<InquiryLean>();
    if (!refreshed) {
      return NextResponse.json(
        { error: "Thread vanished after upload." },
        { status: 500 },
      );
    }
    return NextResponse.json(toStorefrontThread(refreshed), { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error({ error, threadId: id }, "Failed to attach chat upload");
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
