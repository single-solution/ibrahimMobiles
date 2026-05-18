import { requireSession } from "@/lib/api/requireSession";
import {
  connectDB,
  handleMongoError,
  Inquiry,
  INQUIRY_STATUSES,
  type InquiryStatus,
} from "@store/db";
import {
  badRequest,
  FIELD_LIMITS,
  isValidId,
  noContent,
  notFound,
  ok,
  parseBody,
} from "@store/shared";

import { recordActivity } from "@/lib/services/activityLog";
import { toInquiryResponse, type InquiryLean } from "@/lib/serializers/inquiry";

const ALLOWED_STATUSES = new Set<string>(INQUIRY_STATUSES);

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface InquiryUpdateInput {
  status?: unknown;
  notes?: unknown;
  lastMessage?: unknown;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  const doc = await Inquiry.findById(id).lean<InquiryLean>();
  if (!doc) {
    return notFound("Inquiry not found");
  }

  return ok(toInquiryResponse(doc));
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("inquiry_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<InquiryUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const update: Record<string, unknown> = {};
  let nextStatus: InquiryStatus | undefined;
  if (typeof body.status === "string") {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return badRequest(`Status must be one of: ${INQUIRY_STATUSES.join(", ")}`);
    }
    nextStatus = body.status as InquiryStatus;
    update.status = nextStatus;
  }
  if (typeof body.notes === "string") {
    update.notes = body.notes.trim().slice(0, FIELD_LIMITS.messageBody);
  }
  if (typeof body.lastMessage === "string") {
    update.lastMessage = body.lastMessage.trim().slice(0, FIELD_LIMITS.crmNotes);
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  try {
    const doc = await Inquiry.findByIdAndUpdate(id, { $set: update }, {
      new: true,
      runValidators: true,
    }).lean<InquiryLean>();
    if (!doc) {
      return notFound("Inquiry not found");
    }

    await recordActivity({
      actor,
      action: nextStatus ? "status_changed" : "updated",
      resourceType: "inquiry",
      resourceId: id,
      resourceLabel: `${doc.customerName} · ${doc.modelName}`,
      detail: nextStatus ? `Status → ${nextStatus}` : undefined,
    });
    return ok(toInquiryResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("inquiry_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  try {
    const doc = await Inquiry.findByIdAndDelete(id).lean<InquiryLean>();
    if (!doc) {
      return notFound("Inquiry not found");
    }

    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "inquiry",
      resourceId: id,
      resourceLabel: `${doc.customerName} · ${doc.modelName}`,
    });
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
