import type { Types } from "mongoose";
import { FIELD_LIMITS } from "@store/shared";
import type { AdminConversation, AdminConversationSummary } from "@/types/admin";
import type {
  ConversationChannel,
  ConversationMessageAttributes,
  ConversationPriority,
  ConversationStatus,
} from "@store/db";

export interface ConversationLean {
  _id: Types.ObjectId;
  customer?: Types.ObjectId;
  customerName: string;
  customerHandle?: string;
  channel: ConversationChannel;
  topic: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  assignedTo?: Types.ObjectId;
  unreadCount: number;
  lastMessageAt: Date;
  messages: ConversationMessageAttributes[];
  createdAt: Date;
  updatedAt: Date;
}

export function summariseConversation(doc: ConversationLean): AdminConversationSummary {
  const lastMessage = doc.messages?.length ? doc.messages[doc.messages.length - 1] : undefined;
  return {
    id: doc._id.toString(),
    customerId: doc.customer ? doc.customer.toString() : undefined,
    customerName: doc.customerName,
    customerHandle: doc.customerHandle,
    channel: doc.channel,
    topic: doc.topic,
    status: doc.status,
    priority: doc.priority,
    assignedToId: doc.assignedTo ? doc.assignedTo.toString() : undefined,
    unreadCount: doc.unreadCount,
    lastMessageAt: doc.lastMessageAt.toISOString(),
    lastMessagePreview: lastMessage ? lastMessage.body.slice(0, FIELD_LIMITS.shortText) : undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toConversationResponse(doc: ConversationLean): AdminConversation {
  return {
    ...summariseConversation(doc),
    messages: (doc.messages ?? []).map((message) => ({
      id: message._id?.toString() ?? "",
      author: message.author,
      authorName: message.authorName,
      body: message.body,
      createdAt: new Date(message.createdAt).toISOString(),
    })),
  };
}
