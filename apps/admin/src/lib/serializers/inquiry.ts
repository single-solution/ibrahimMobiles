import type { Types } from "mongoose";
import type {
  InquiryAttributes,
  InquiryMessageAttributes,
  WithTimestamps,
} from "@store/db";
import type {
  AdminInquiry,
  AdminInquiryMessage,
  AdminInquirySummary,
} from "@/types/models";
import {
  asArray,
  asString,
  normalizeChatAttachment,
  normalizeChatMessageAuthor,
  normalizeChatStatus,
  objectIdString,
  toIsoDate,
} from "@store/shared";

export type InquiryLean = WithTimestamps<InquiryAttributes> & {
  _id: Types.ObjectId;
};

function resolveInquiryTimestamp(inquiry: InquiryLean): Date {
  const fallback =
    inquiry.messages?.[inquiry.messages.length - 1]?.createdAt ??
    inquiry.updatedAt ??
    inquiry.createdAt ??
    new Date(0);
  return new Date(fallback);
}

function toMessageResponse(
  message: InquiryMessageAttributes,
): AdminInquiryMessage {
  const attachments = asArray<unknown>(message.attachments)
    .map(normalizeChatAttachment)
    .filter((attachment): attachment is NonNullable<typeof attachment> =>
      Boolean(attachment),
    );
  return {
    id: objectIdString(message._id),
    author: normalizeChatMessageAuthor(message.author),
    authorName: message.authorName,
    authorUserId: objectIdString(message.authorUserId) || undefined,
    body: asString(message.body),
    attachments: attachments.length > 0 ? attachments : undefined,
    createdAt: toIsoDate(message.createdAt),
    readByCustomerAt: message.readByCustomerAt
      ? toIsoDate(message.readByCustomerAt)
      : undefined,
  };
}

export function summariseInquiry(inquiry: InquiryLean): AdminInquirySummary {
  const fallbackTimestamp = resolveInquiryTimestamp(inquiry);
  return {
    id: objectIdString(inquiry._id),
    customerId: objectIdString(inquiry.customerId) || undefined,
    customerName: asString(inquiry.customerName, "Customer"),
    phoneNumber: asString(inquiry.phoneNumber),
    subjectProductId: objectIdString(inquiry.subjectProductId) || undefined,
    subjectProductName: inquiry.subjectProductName,
    status: normalizeChatStatus(inquiry.status),
    assignedToUserId: objectIdString(inquiry.assignedToUserId) || undefined,
    lastMessageAt: toIsoDate(inquiry.lastMessageAt, fallbackTimestamp),
    lastMessagePreview: inquiry.lastMessagePreview ?? "",
    lastMessageAuthor: normalizeChatMessageAuthor(inquiry.lastMessageAuthor),
    unreadByCustomer: inquiry.unreadByCustomer ?? 0,
    unreadByTeam: inquiry.unreadByTeam ?? 0,
    escalated: inquiry.assistantMuted ?? false,
    createdAt: toIsoDate(inquiry.createdAt, fallbackTimestamp),
    updatedAt: toIsoDate(inquiry.updatedAt, fallbackTimestamp),
  };
}

export function toInquiryResponse(
  inquiry: InquiryLean,
  options: { includeInternal?: boolean } = {},
): AdminInquiry {
  const summary = summariseInquiry(inquiry);
  return {
    ...summary,
    internalNotes: options.includeInternal ? inquiry.internalNotes : undefined,
    messages: asArray<InquiryMessageAttributes>(inquiry.messages).map(toMessageResponse),
  };
}
