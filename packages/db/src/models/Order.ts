import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export const ORDER_STATUSES = [
  "pending-payment",
  "confirmed",
  "dispatched",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const DELIVERY_METHODS = ["courier", "pickup"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const PAYMENT_METHODS = ["bank-transfer", "easypaisa", "jazzcash", "cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

interface OrderItemAttributes {
  /** Mongoose-generated when pushing into the parent doc. */
  _id?: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  productName: string;
  variantSummary: string;
  unitPriceRupees: number;
  quantity: number;
}

interface OrderAddressAttributes {
  recipientName: string;
  phoneNumber: string;
  city: string;
  area?: string;
  street?: string;
  postalCode?: string;
}

export interface OrderTimelineEntryAttributes {
  /** Mongoose-generated when pushing into the parent doc. */
  _id?: mongoose.Types.ObjectId;
  status: OrderStatus;
  occurredAt: Date;
  note?: string;
}

interface OrderTotalsAttributes {
  subtotalRupees: number;
  shippingRupees: number;
  discountRupees: number;
  totalRupees: number;
}

export interface OrderAttributes {
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerSnapshot: { name: string; phoneNumber: string; city: string };
  status: OrderStatus;
  items: OrderItemAttributes[];
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  address?: OrderAddressAttributes;
  totals: OrderTotalsAttributes;
  timeline: OrderTimelineEntryAttributes[];
  trackingNote?: string;
  estimatedDeliveryAt?: Date;
  pointsEarned: number;
  pointsRedeemed: number;
  placedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDoc = HydratedDocument<OrderAttributes>;

const orderItemSchema = new Schema<OrderItemAttributes>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true, trim: true, maxlength: 160 },
    variantSummary: { type: String, required: true, trim: true, maxlength: 200 },
    unitPriceRupees: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: true, timestamps: false },
);

const addressSchema = new Schema<OrderAddressAttributes>(
  {
    recipientName: { type: String, required: true, trim: true, maxlength: 120 },
    phoneNumber: { type: String, required: true, trim: true, maxlength: 32 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    area: { type: String, trim: true, maxlength: 120 },
    street: { type: String, trim: true, maxlength: 200 },
    postalCode: { type: String, trim: true, maxlength: 16 },
  },
  { _id: false, timestamps: false },
);

const timelineSchema = new Schema<OrderTimelineEntryAttributes>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    occurredAt: { type: Date, required: true, default: () => new Date() },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: true, timestamps: false },
);

const totalsSchema = new Schema<OrderTotalsAttributes>(
  {
    subtotalRupees: { type: Number, required: true, min: 0 },
    shippingRupees: { type: Number, required: true, min: 0, default: 0 },
    discountRupees: { type: Number, required: true, min: 0, default: 0 },
    totalRupees: { type: Number, required: true, min: 0 },
  },
  { _id: false, timestamps: false },
);

const orderSchema = new Schema<OrderAttributes>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 32,
      index: true,
    },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    customerSnapshot: {
      name: { type: String, required: true, trim: true, maxlength: 160 },
      phoneNumber: { type: String, required: true, trim: true, maxlength: 32 },
      city: { type: String, required: true, trim: true, maxlength: 80 },
    },
    status: { type: String, enum: ORDER_STATUSES, required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    delivery: { type: String, enum: DELIVERY_METHODS, required: true },
    payment: { type: String, enum: PAYMENT_METHODS, required: true },
    address: { type: addressSchema },
    totals: { type: totalsSchema, required: true },
    timeline: { type: [timelineSchema], default: [] },
    trackingNote: { type: String, trim: true, maxlength: 500 },
    estimatedDeliveryAt: { type: Date },
    pointsEarned: { type: Number, required: true, min: 0, default: 0 },
    pointsRedeemed: { type: Number, required: true, min: 0, default: 0 },
    placedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, placedAt: -1 });
orderSchema.index({ placedAt: -1 });
// Backs the referential-integrity check inside DELETE /api/admin/products/[id]
// and any "orders containing product X" lookup the admin reports drive.
orderSchema.index({ "items.productId": 1 });

export const Order: Model<OrderAttributes> =
  (mongoose.models.Order as Model<OrderAttributes>) ??
  mongoose.model<OrderAttributes>("Order", orderSchema);
