import { Types } from "mongoose";

import { Inquiry } from "@store/db";

export async function claimInquiriesForCustomer(args: {
  customerId: Types.ObjectId;
  phoneNumber: string;
}): Promise<void> {
  const phoneNumber = args.phoneNumber.trim();
  if (!phoneNumber) {
    return;
  }

  await Inquiry.updateMany(
    {
      phoneNumber,
      $or: [{ customerId: { $exists: false } }, { customerId: null }],
    },
    {
      $set: { customerId: args.customerId },
    },
  );
}
