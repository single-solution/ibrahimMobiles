import { Types } from "mongoose";

import { Customer, Inquiry, connectDB } from "@store/db";
import { isAnonymousChatPhone } from "@store/shared";

import type { InquiryLean } from "@/lib/chat/serializer";

/**
 * Link an anonymous preview thread to the signed-in customer after OTP login.
 */
export async function claimAnonymousThreadIfNeeded(
  inquiry: InquiryLean,
  customerId: string,
): Promise<InquiryLean> {
  if (!isAnonymousChatPhone(inquiry.phoneNumber) || inquiry.customerId) {
    return inquiry;
  }

  await connectDB();
  const customer = await Customer.findById(customerId)
    .select({ name: 1, phoneNumber: 1 })
    .lean<{ name: string; phoneNumber: string }>();
  if (!customer) {
    return inquiry;
  }

  const updated = await Inquiry.findByIdAndUpdate(
    inquiry._id,
    {
      $set: {
        customerId: new Types.ObjectId(customerId),
        customerName: customer.name,
        phoneNumber: customer.phoneNumber,
      },
    },
    { new: true },
  ).lean<InquiryLean>();

  return updated ?? inquiry;
}
