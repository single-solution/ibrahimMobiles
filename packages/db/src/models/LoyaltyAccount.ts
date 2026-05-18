import mongoose, { Schema, type Model } from "mongoose";

export const LOYALTY_TRANSACTION_KINDS = ["earn", "redeem", "bonus", "expire", "adjust"] as const;
export type LoyaltyTransactionKind = (typeof LOYALTY_TRANSACTION_KINDS)[number];

interface LoyaltyTransactionAttributes {
  /** Mongoose-generated when pushing into a parent doc; always present after save. */
  _id?: mongoose.Types.ObjectId;
  kind: LoyaltyTransactionKind;
  amount: number;
  occurredAt: Date;
  reason: string;
  orderRef?: string;
  recordedByUserId?: mongoose.Types.ObjectId;
}

export interface LoyaltyAccountAttributes {
  customerId: mongoose.Types.ObjectId;
  balance: number;
  lifetimeEarned: number;
  pendingFromShipping: number;
  transactions: LoyaltyTransactionAttributes[];
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<LoyaltyTransactionAttributes>(
  {
    kind: { type: String, enum: LOYALTY_TRANSACTION_KINDS, required: true },
    amount: { type: Number, required: true },
    occurredAt: { type: Date, required: true, default: () => new Date() },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
    orderRef: { type: String, trim: true, maxlength: 32 },
    recordedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true, timestamps: false },
);

const loyaltyAccountSchema = new Schema<LoyaltyAccountAttributes>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
      index: true,
    },
    balance: { type: Number, required: true, default: 0, min: 0 },
    lifetimeEarned: { type: Number, required: true, default: 0, min: 0 },
    pendingFromShipping: { type: Number, required: true, default: 0, min: 0 },
    transactions: { type: [transactionSchema], default: [] },
  },
  { timestamps: true },
);

export const LoyaltyAccount: Model<LoyaltyAccountAttributes> =
  (mongoose.models.LoyaltyAccount as Model<LoyaltyAccountAttributes>) ??
  mongoose.model<LoyaltyAccountAttributes>("LoyaltyAccount", loyaltyAccountSchema);
