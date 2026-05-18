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
  Conversation,
  CONVERSATION_CHANNELS,
  CONVERSATION_PRIORITIES,
  CONVERSATION_STATUSES,
  type ConversationChannel,
  type ConversationPriority,
  handleMongoError,
} from "@store/db";

import { recordActivity } from "@/lib/services/activityLog";

import {
  summariseConversation,
  type ConversationLean,
} from "@/lib/serializers/conversation";
import type { AdminConversationSummary } from "@/types/admin";

export async function GET(request: Request) {
  const { response } = await requireSession("ai_view");
  if (response) {
    return response;
  }

  await connectDB();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const channel = url.searchParams.get("channel");
  const { page, limit, skip, search, searchPattern } = readListOptions(request);

  const filter: Record<string, unknown> = {};
  if (status && (CONVERSATION_STATUSES as readonly string[]).includes(status)) {
    filter.status = status;
  }
  if (channel && (CONVERSATION_CHANNELS as readonly string[]).includes(channel)) {
    filter.channel = channel;
  }
  if (search) {
    filter.$or = [
      { customerName: { $regex: searchPattern, $options: "i" } },
      { customerHandle: { $regex: searchPattern, $options: "i" } },
      { topic: { $regex: searchPattern, $options: "i" } },
    ];
  }

  const [docs, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<ConversationLean[]>(),
    Conversation.countDocuments(filter),
  ]);

  const payload: ListResponse<AdminConversationSummary> = {
    items: docs.map(summariseConversation),
    total,
    page,
    limit,
  };
  return ok(payload);
}

interface ConversationInput {
  customerName?: unknown;
  customerHandle?: unknown;
  channel?: unknown;
  topic?: unknown;
  priority?: unknown;
  initialMessage?: unknown;
}

function parseChannel(value: unknown): ConversationChannel {
  if (typeof value === "string" && (CONVERSATION_CHANNELS as readonly string[]).includes(value)) {
    return value as ConversationChannel;
  }
  return "chat";
}

function parsePriority(value: unknown): ConversationPriority {
  if (typeof value === "string" && (CONVERSATION_PRIORITIES as readonly string[]).includes(value)) {
    return value as ConversationPriority;
  }
  return "normal";
}

export async function POST(request: Request) {
  const { actor, response } = await requireSession("ai_view");
  if (response) {
    return response;
  }

  const body = await parseBody<ConversationInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const customerNameResult = validateString(body.customerName, {
    label: "Customer name",
    max: FIELD_LIMITS.personName,
  });
  if (isValidationError(customerNameResult)) {
    return badRequest(customerNameResult.error);
  }

  const topicResult = validateString(body.topic, {
    label: "Topic",
    max: FIELD_LIMITS.shortText,
  });
  if (isValidationError(topicResult)) {
    return badRequest(topicResult.error);
  }

  const handle =
    typeof body.customerHandle === "string" && body.customerHandle.trim().length > 0
      ? body.customerHandle.trim().slice(0, FIELD_LIMITS.customerHandle)
      : undefined;

  const initialMessage =
    typeof body.initialMessage === "string" && body.initialMessage.trim().length > 0
      ? body.initialMessage.trim().slice(0, FIELD_LIMITS.messageBody)
      : undefined;

  const now = new Date();
  await connectDB();
  try {
    const doc = await Conversation.create({
      customerName: customerNameResult,
      customerHandle: handle,
      channel: parseChannel(body.channel),
      topic: topicResult,
      priority: parsePriority(body.priority),
      lastMessageAt: now,
      messages: initialMessage
        ? [
            {
              author: "customer",
              authorName: customerNameResult,
              body: initialMessage,
              createdAt: now,
            },
          ]
        : [],
    });
    await recordActivity({
      actor,
      action: "created",
      resourceType: "conversation",
      resourceId: doc._id.toString(),
      resourceLabel: doc.topic,
    });
    return created(summariseConversation(doc.toObject() as ConversationLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
