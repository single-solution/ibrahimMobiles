import mongoose, { Schema, type Model } from "mongoose";

export interface CustomerAddressAttributes {
  /** Mongoose-generated when pushing into the parent doc. */
  _id?: mongoose.Types.ObjectId;
  label?: string;
  recipientName: string;
  phoneNumber: string;
  city: string;
  area?: string;
  street?: string;
  postalCode?: string;
  isDefault: boolean;
}

export interface CustomerAttributes {
  name: string;
  email?: string;
  phoneNumber: string;
  city: string;
  isLoyaltyMember: boolean;
  notes?: string;
  addresses: CustomerAddressAttributes[];
  /** Optional account hookup once we open public sign-up. */
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<CustomerAddressAttributes>(
  {
    label: { type: String, trim: true, maxlength: 60 },
    recipientName: { type: String, required: true, trim: true, maxlength: 120 },
    phoneNumber: { type: String, required: true, trim: true, maxlength: 32 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    area: { type: String, trim: true, maxlength: 120 },
    street: { type: String, trim: true, maxlength: 200 },
    postalCode: { type: String, trim: true, maxlength: 16 },
    isDefault: { type: Boolean, required: true, default: false },
  },
  { _id: true, timestamps: false },
);

const customerSchema = new Schema<CustomerAttributes>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, trim: true, lowercase: true, maxlength: 320, index: true, sparse: true },
    phoneNumber: { type: String, required: true, trim: true, maxlength: 32, index: true },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    isLoyaltyMember: { type: Boolean, required: true, default: false },
    notes: { type: String, trim: true, maxlength: 2_000 },
    addresses: { type: [addressSchema], default: [] },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

customerSchema.index({ name: 1 });
customerSchema.index({ createdAt: -1 });

export const Customer: Model<CustomerAttributes> =
  (mongoose.models.Customer as Model<CustomerAttributes>) ??
  mongoose.model<CustomerAttributes>("Customer", customerSchema);
