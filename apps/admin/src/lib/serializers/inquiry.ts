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
} from "@/types/admin";

export type InquiryLean = WithTimestamps<InquiryAttributes> & {
  _id: Types.ObjectId;
};

function toMessageResponse(
  message: InquiryMessageAttributes,
): AdminInquiryMessage {
  return {
    id: message._id?.toString() ?? "",
    author: message.author,
    authorName: message.authorName,
    authorUserId: message.authorUserId?.toString(),
    body: message.body,
    attachments: message.attachments,
    createdAt: new Date(message.createdAt).toISOString(),
    readByCustomerAt: message.readByCustomerAt
      ? new Date(message.readByCustomerAt).toISOString()
      : undefined,
  };
}

export function summariseInquiry(inquiry: InquiryLean): AdminInquirySummary {
  return {
    id: inquiry._id.toString(),
    customerId: inquiry.customerId?.toString(),
    customerName: inquiry.customerName,
    phoneNumber: inquiry.phoneNumber,
    subjectProductId: inquiry.subjectProductId?.toString(),
    subjectProductName: inquiry.subjectProductName,
    status: inquiry.status,
    assignedToUserId: inquiry.assignedToUserId?.toString(),
    lastMessageAt: inquiry.lastMessageAt.toISOString(),
    lastMessagePreview: inquiry.lastMessagePreview,
    lastMessageAuthor: inquiry.lastMessageAuthor,
    unreadByCustomer: inquiry.unreadByCustomer,
    unreadByTeam: inquiry.unreadByTeam,
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
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
    messages: (inquiry.messages ?? []).map(toMessageResponse),
  };
}
