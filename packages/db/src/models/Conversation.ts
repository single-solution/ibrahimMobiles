import mongoose, { Schema, type Model } from "mongoose";

export const CONVERSATION_CHANNELS = ["chat", "whatsapp", "phone", "email", "instagram"] as const;
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];

export const CONVERSATION_STATUSES = ["open", "waiting", "resolved"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const CONVERSATION_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type ConversationPriority = (typeof CONVERSATION_PRIORITIES)[number];

export const CONVERSATION_MESSAGE_AUTHORS = ["customer", "agent", "ai"] as const;
export type ConversationMessageAuthor = (typeof CONVERSATION_MESSAGE_AUTHORS)[number];

export interface ConversationMessageAttributes {
  /** Mongoose-generated when pushing into the parent doc. */
  _id?: mongoose.Types.ObjectId;
  author: ConversationMessageAuthor;
  authorName?: string;
  body: string;
  createdAt: Date;
}

interface ConversationAttributes {
  customer?: mongoose.Types.ObjectId;
  customerName: string;
  customerHandle?: string;
  channel: ConversationChannel;
  topic: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  assignedTo?: mongoose.Types.ObjectId;
  unreadCount: number;
  lastMessageAt: Date;
  messages: ConversationMessageAttributes[];
  createdAt: Date;
  updatedAt: Date;
}

const conversationMessageSchema = new Schema<ConversationMessageAttributes>(
  {
    author: { type: String, enum: CONVERSATION_MESSAGE_AUTHORS, required: true },
    authorName: { type: String, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 4_000 },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: true },
);

const conversationSchema = new Schema<ConversationAttributes>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true, trim: true, maxlength: 160 },
    customerHandle: { type: String, trim: true, maxlength: 160 },
    channel: { type: String, enum: CONVERSATION_CHANNELS, required: true, default: "chat" },
    topic: { type: String, required: true, trim: true, maxlength: 200 },
    status: { type: String, enum: CONVERSATION_STATUSES, required: true, default: "open" },
    priority: {
      type: String,
      enum: CONVERSATION_PRIORITIES,
      required: true,
      default: "normal",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    unreadCount: { type: Number, required: true, default: 0, min: 0 },
    lastMessageAt: { type: Date, required: true, default: () => new Date() },
    messages: { type: [conversationMessageSchema], default: [] },
  },
  { timestamps: true },
);

conversationSchema.index({ status: 1, lastMessageAt: -1 });
conversationSchema.index({ assignedTo: 1, status: 1 });

export const Conversation: Model<ConversationAttributes> =
  (mongoose.models.Conversation as Model<ConversationAttributes>) ??
  mongoose.model<ConversationAttributes>("Conversation", conversationSchema);
