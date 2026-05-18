import type { Types } from "mongoose";
import type { InquiryAttributes } from "@store/db";
import type { AdminInquiry } from "@/types/admin";

export type InquiryLean = InquiryAttributes & { _id: Types.ObjectId };

export function toInquiryResponse(inquiry: InquiryLean): AdminInquiry {
  return {
    id: inquiry._id.toString(),
    customerName: inquiry.customerName,
    customerCity: inquiry.customerCity,
    phoneNumber: inquiry.phoneNumber,
    modelName: inquiry.modelName,
    variantSummary: inquiry.variantSummary,
    expectedRupees: inquiry.expectedRupees,
    source: inquiry.source,
    status: inquiry.status,
    receivedAt: inquiry.receivedAt.toISOString(),
    lastMessage: inquiry.lastMessage,
    notes: inquiry.notes,
    productId: inquiry.productId?.toString(),
    customerId: inquiry.customerId?.toString(),
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
  };
}
