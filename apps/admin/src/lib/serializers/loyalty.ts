import type { Types } from "mongoose";
import type { LoyaltyAccountAttributes } from "@store/db";
import type { AdminLoyaltyAccount } from "@/types/admin";

export type LoyaltyAccountLean = LoyaltyAccountAttributes & { _id: Types.ObjectId };

export function toLoyaltyAccountResponse(
  account: LoyaltyAccountLean,
  customerName: string,
): AdminLoyaltyAccount {
  return {
    id: account._id.toString(),
    customerId: account.customerId.toString(),
    customerName,
    balance: account.balance,
    lifetimeEarned: account.lifetimeEarned,
    pendingFromShipping: account.pendingFromShipping,
    transactions: (account.transactions ?? []).map((transaction) => ({
      // Lean documents always carry the auto-generated _id; the optional type
      // is only relaxed for in-memory `push` calls before save.
      id: transaction._id?.toString() ?? "",
      kind: transaction.kind,
      amount: transaction.amount,
      occurredAt: transaction.occurredAt.toISOString(),
      reason: transaction.reason,
      orderRef: transaction.orderRef,
    })),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
