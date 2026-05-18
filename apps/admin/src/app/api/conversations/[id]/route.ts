import { requireSession } from "@/lib/api/requireSession";
import {
  connectDB,
  Conversation,
  CONVERSATION_PRIORITIES,
  CONVERSATION_STATUSES,
  handleMongoError,
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
import {
  toConversationResponse,
  type ConversationLean,
} from "@/lib/serializers/conversation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { response } = await requireSession("ai_view");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  const doc = await Conversation.findById(id).lean<ConversationLean>();
  if (!doc) {
    return notFound("Conversation not found");
  }

  return ok(toConversationResponse(doc));
}

interface ConversationUpdateInput {
  status?: unknown;
  priority?: unknown;
  topic?: unknown;
  unreadCount?: unknown;
  assignedToId?: unknown;
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("ai_view");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<ConversationUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (
      typeof body.status !== "string" ||
      !(CONVERSATION_STATUSES as readonly string[]).includes(body.status)
    ) {
      return badRequest("Invalid status.");
    }
    update.status = body.status;
  }
  if (body.priority !== undefined) {
    if (
      typeof body.priority !== "string" ||
      !(CONVERSATION_PRIORITIES as readonly string[]).includes(body.priority)
    ) {
      return badRequest("Invalid priority.");
    }
    update.priority = body.priority;
  }
  if (body.topic !== undefined) {
    if (typeof body.topic !== "string" || body.topic.trim().length === 0) {
      return badRequest("Topic is required.");
    }
    update.topic = body.topic.trim().slice(0, FIELD_LIMITS.shortText);
  }
  if (typeof body.unreadCount === "number") {
    update.unreadCount = Math.max(0, Math.floor(body.unreadCount));
  }
  if (body.assignedToId !== undefined) {
    if (body.assignedToId === null || body.assignedToId === "") {
      update.assignedTo = null;
    } else if (typeof body.assignedToId === "string" && isValidId(body.assignedToId)) {
      update.assignedTo = body.assignedToId;
    } else {
      return badRequest("Invalid assignedToId.");
    }
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  try {
    const doc = await Conversation.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    ).lean<ConversationLean>();
    if (!doc) {
      return notFound("Conversation not found");
    }

    await recordActivity({
      actor,
      action: "updated",
      resourceType: "conversation",
      resourceId: id,
      resourceLabel: doc.topic,
    });
    return ok(toConversationResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("ai_view");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  try {
    const doc = await Conversation.findByIdAndDelete(id).lean<ConversationLean>();
    if (!doc) {
      return notFound("Conversation not found");
    }

    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "conversation",
      resourceId: id,
      resourceLabel: doc.topic,
    });
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
