import mongoose, { Schema, type Model } from "mongoose";

export const INQUIRY_STATUSES = [
  "new",
  "in-progress",
  "awaiting-customer",
  "won",
  "lost",
] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_SOURCES = [
  "whatsapp",
  "phone",
  "facebook",
  "instagram",
  "walk-in",
  "website",
  "other",
] as const;
export type InquirySource = (typeof INQUIRY_SOURCES)[number];

export interface InquiryAttributes {
  customerName: string;
  customerCity: string;
  phoneNumber: string;
  modelName: string;
  variantSummary?: string;
  expectedRupees?: number;
  source: InquirySource;
  status: InquiryStatus;
  receivedAt: Date;
  lastMessage: string;
  notes?: string;
  productId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  assignedToUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inquirySchema = new Schema<InquiryAttributes>(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 160 },
    customerCity: { type: String, required: true, trim: true, maxlength: 80 },
    phoneNumber: { type: String, required: true, trim: true, maxlength: 32, index: true },
    modelName: { type: String, required: true, trim: true, maxlength: 160 },
    variantSummary: { type: String, trim: true, maxlength: 200 },
    expectedRupees: { type: Number, min: 0 },
    source: { type: String, enum: INQUIRY_SOURCES, required: true, index: true },
    status: { type: String, enum: INQUIRY_STATUSES, required: true, default: "new", index: true },
    receivedAt: { type: Date, required: true, default: () => new Date(), index: true },
    lastMessage: { type: String, required: true, trim: true, maxlength: 2_000 },
    notes: { type: String, trim: true, maxlength: 4_000 },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    assignedToUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

inquirySchema.index({ status: 1, receivedAt: -1 });

export const Inquiry: Model<InquiryAttributes> =
  (mongoose.models.Inquiry as Model<InquiryAttributes>) ??
  mongoose.model<InquiryAttributes>("Inquiry", inquirySchema);
