import { requireSession } from "@/lib/api/requireSession";
import {
  connectDB,
  Conversation,
  CONVERSATION_MESSAGE_AUTHORS,
  type ConversationMessageAuthor,
  handleMongoError,
} from "@store/db";
import {
  badRequest,
  created,
  FIELD_LIMITS,
  isValidId,
  notFound,
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

interface MessageInput {
  body?: unknown;
  author?: unknown;
  authorName?: unknown;
}

function parseAuthor(value: unknown): ConversationMessageAuthor {
  if (
    typeof value === "string" &&
    (CONVERSATION_MESSAGE_AUTHORS as readonly string[]).includes(value)
  ) {
    return value as ConversationMessageAuthor;
  }
  return "agent";
}

export async function POST(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("ai_view");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<MessageInput>(request);
  if (body instanceof Response) {
    return body;
  }

  if (typeof body.body !== "string" || body.body.trim().length === 0) {
    return badRequest("Message body is required.");
  }
  const messageBody = body.body.trim().slice(0, FIELD_LIMITS.messageBody);
  const author = parseAuthor(body.author);
  const authorName =
    typeof body.authorName === "string" && body.authorName.trim().length > 0
      ? body.authorName.trim().slice(0, FIELD_LIMITS.authorName)
      : author === "agent"
        ? actor.name
        : undefined;
  const now = new Date();

  await connectDB();
  try {
    // Only customer-authored messages bump the unread counter — agent/AI
    // replies are read by definition.
    const updateOps: Record<string, unknown> = {
      $push: {
        messages: {
          author,
          authorName,
          body: messageBody,
          createdAt: now,
        },
      },
      $set: { lastMessageAt: now },
    };
    if (author === "customer") {
      updateOps.$inc = { unreadCount: 1 };
    }

    const doc = await Conversation.findByIdAndUpdate(
      id,
      updateOps,
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
      detail: `Message added by ${author}`,
    });
    return created(toConversationResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}
