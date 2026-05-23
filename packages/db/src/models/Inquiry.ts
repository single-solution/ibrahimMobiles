import mongoose, { Schema, type Model } from "mongoose";
import type { StoredImage } from "@store/shared";
import { storedImageSchema } from "../schemas/storedImageSchema";

/**
 * Customer ↔ team chat thread. Phase 1 rewrites the legacy "single
 * snapshot" Inquiry into a proper threaded conversation per PLAN §12.
 * The model is durable storage; the live transport (polling default,
 * WebSocket opt-in via `Setting.chat.*`) lands in Phase 8, attachments
 * (shared `StoredImage` for images, raw url+mime for files) land in
 * Phase 8.5.
 *
 * Identity: `phoneNumber` is the canonical anchor. `customerId` is
 * populated whenever a session or an admin "link customer" action
 * provides one; guests stay phone-only and the storefront uses the
 * `inquiry_thread_token` cookie (Phase 8) to scope their visibility.
 *
 * Cleanup vs the legacy shape:
 *   - `modelName` / `variantSummary` / `expectedRupees` / `customerCity`
 *     / `source` / `receivedAt` / `lastMessage` → folded into the first
 *     `messages[0]` body during the T1.20 migration, then dropped.
 *   - `productId` → `subjectProductId`; the migration snapshots
 *     `product.modelName` into `subjectProductName` before the catalog
 *     wipe (T1.21) nulls the foreign key.
 *   - `status` enum collapses from 5 values to 3: `open |
 *     awaiting-customer | resolved`. Customer reply on a resolved thread
 *     flips it back to `open`; admin reply on an open thread flips it
 *     to `awaiting-customer`.
 *   - `notes` → `internalNotes` (admin-only read scope made explicit).
 *
 * `customerName` is the **full name** per PLAN §12.5; storefront
 * validation requires ≥2 chars matching `/^[\p{L}\p{M}\s.'-]+$/u` so
 * Urdu / hyphenated / accented names round-trip without rejection.
 */

export const INQUIRY_STATUSES = [
  "open",
  "awaiting-customer",
  "resolved",
] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_MESSAGE_AUTHORS = ["customer", "agent"] as const;
export type InquiryMessageAuthor = (typeof INQUIRY_MESSAGE_AUTHORS)[number];

export const INQUIRY_ATTACHMENT_KINDS = ["image", "file"] as const;
export type InquiryAttachmentKind = (typeof INQUIRY_ATTACHMENT_KINDS)[number];

/**
 * Per-message attachment. Image attachments funnel through the shared
 * `StoredImage` pipeline (T1.1.5 / Phase 2 upload route) so the chat
 * bubble renders the `thumb` variant inline and the lightbox renders
 * `full`. Non-image attachments stay as raw URL + mime metadata — there
 * is no resize / variant generation for PDFs or arbitrary files.
 */
export interface InquiryImageAttachment {
  kind: "image";
  image: StoredImage;
}
export interface InquiryFileAttachment {
  kind: "file";
  url: string;
  mime: string;
  sizeBytes: number;
  filename: string;
}
export type InquiryAttachment = InquiryImageAttachment | InquiryFileAttachment;

export interface InquiryMessageAttributes {
  _id?: mongoose.Types.ObjectId;
  author: InquiryMessageAuthor;
  /**
   * Display name for the message. For customer messages: the inquiry's
   * `customerName`. For agent messages: the replying admin's full name.
   * Denormalised so old messages keep their original signature even if
   * the underlying user / customer is renamed later.
   */
  authorName?: string;
  /** Set when `author === "agent"` — the replying admin user. */
  authorUserId?: mongoose.Types.ObjectId;
  body: string;
  attachments?: InquiryAttachment[];
  createdAt: Date;
  /** Customer-side read receipt for agent messages. */
  readByCustomerAt?: Date;
}

export interface InquiryAttributes {
  customerName: string;
  phoneNumber: string;
  customerId?: mongoose.Types.ObjectId;
  subjectProductId?: mongoose.Types.ObjectId;
  subjectProductName?: string;
  status: InquiryStatus;
  assignedToUserId?: mongoose.Types.ObjectId;
  lastMessageAt: Date;
  lastMessagePreview: string;
  lastMessageAuthor: InquiryMessageAuthor;
  unreadByCustomer: number;
  unreadByTeam: number;
  internalNotes?: string;
  messages: InquiryMessageAttributes[];
}

/**
 * Attachment storage uses Mongoose's discriminated-subdocument pattern.
 * The parent `inquiryAttachmentSchema` carries the `kind` discriminator
 * key + a shared `_id: false`; the two children declare only their own
 * fields (Mongoose injects `kind` automatically from the discriminator
 * name — declaring it explicitly here throws "cannot have field with
 * name kind"). See PLAN §10 → Inquiry.messages[i].attachments[].
 */
const inquiryImageAttachmentSchema = new Schema<
  Omit<InquiryImageAttachment, "kind">
>(
  {
    image: { type: storedImageSchema, required: true },
  },
  { _id: false },
);

const inquiryFileAttachmentSchema = new Schema<
  Omit<InquiryFileAttachment, "kind">
>(
  {
    url: { type: String, required: true, trim: true, maxlength: 600 },
    mime: { type: String, required: true, trim: true, maxlength: 120 },
    sizeBytes: { type: Number, required: true, min: 0 },
    filename: { type: String, required: true, trim: true, maxlength: 240 },
  },
  { _id: false },
);

const inquiryAttachmentSchema = new Schema<InquiryAttachment>(
  {},
  { _id: false, discriminatorKey: "kind" },
);
inquiryAttachmentSchema.discriminator("image", inquiryImageAttachmentSchema);
inquiryAttachmentSchema.discriminator("file", inquiryFileAttachmentSchema);

const inquiryMessageSchema = new Schema<InquiryMessageAttributes>(
  {
    author: {
      type: String,
      enum: INQUIRY_MESSAGE_AUTHORS,
      required: true,
    },
    authorName: { type: String, trim: true, maxlength: 160 },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User" },
    body: { type: String, required: true, trim: true, maxlength: 8_000 },
    attachments: {
      type: [inquiryAttachmentSchema],
      default: undefined,
    },
    createdAt: { type: Date, required: true, default: () => new Date() },
    readByCustomerAt: { type: Date },
  },
  { _id: true },
);

const inquirySchema = new Schema<InquiryAttributes>(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
      index: true,
    },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    subjectProductId: { type: Schema.Types.ObjectId, ref: "Product" },
    subjectProductName: { type: String, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      required: true,
      default: "open",
    },
    assignedToUserId: { type: Schema.Types.ObjectId, ref: "User" },
    lastMessageAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    lastMessagePreview: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280,
      default: "",
    },
    lastMessageAuthor: {
      type: String,
      enum: INQUIRY_MESSAGE_AUTHORS,
      required: true,
      default: "customer",
    },
    unreadByCustomer: { type: Number, required: true, default: 0, min: 0 },
    unreadByTeam: { type: Number, required: true, default: 1, min: 0 },
    internalNotes: { type: String, trim: true, maxlength: 4_000 },
    messages: { type: [inquiryMessageSchema], default: [] },
  },
  { timestamps: true },
);

// Inbox sort: status filter + recent activity descending.
inquirySchema.index({ status: 1, lastMessageAt: -1 });
// "My inbox" lookup for an admin viewer.
inquirySchema.index({ assignedToUserId: 1, status: 1, lastMessageAt: -1 });
// /account/messages list — the signed-in customer's own threads.
inquirySchema.index({ customerId: 1, lastMessageAt: -1 });

export const Inquiry: Model<InquiryAttributes> =
  (mongoose.models.Inquiry as Model<InquiryAttributes>) ??
  mongoose.model<InquiryAttributes>("Inquiry", inquirySchema);
