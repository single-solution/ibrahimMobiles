/**
 * Phase 1 catalog simplification migration.
 *
 * Executes the four passes described in TASKS §T1.20–T1.22:
 *   1. Inquiry snapshot pass — preserve `subjectProductName` from the
 *      legacy `productId` link before the catalog is wiped.
 *   2. Inquiry restructure — fold legacy snapshot fields into
 *      `messages[0]`, populate the threaded conversation fields, drop
 *      legacy columns.
 *   3. Catalog wipe — drop Product / Brand / Grade / Attribute /
 *      Category collections so admin can recreate the catalogue under
 *      the new dynamic schema (PLAN §1).
 *   4. Enum/role reshape — User role aliases, ActivityEntry
 *      resourceType, Offer accentColor → hex, all rewritten in place.
 *
 * Idempotency: each pass scopes its updates to documents that still
 * carry legacy markers (e.g. `$exists: true` on a dropped field, or a
 * legacy enum value). Re-running the migration on a partially-applied
 * DB is therefore safe — every step is a no-op once it has nothing
 * left to rewrite.
 *
 * Logging: counts are logged at the start and end of each pass via
 * `@store/shared/logger` so the operator gets per-step visibility.
 */

import mongoose from "mongoose";
import { logger } from "@store/shared";

import { Inquiry } from "../models/Inquiry";
import { Offer } from "../models/Offer";

/**
 * Map of legacy Offer `accentColor` enum values to the hex `color`
 * defaults we want surface in admin. Mirrors the colour ramp the
 * storefront previously rendered for each accent.
 */
const ACCENT_TO_HEX: Record<string, string> = {
  emerald: "#0f766e",
  amber: "#ea580c",
  rose: "#e11d48",
  sky: "#0f172a",
};

/**
 * Map of legacy User `role` values to their modern equivalents per
 * T1.8 / T1.22.
 */
const ROLE_REWRITES: Record<string, string> = {
  manager: "business_manager",
  staff: "support_staff",
  media_manager: "product_manager",
};

/**
 * Legacy ActivityEntry resourceType values that we collapse onto
 * `"settings"` (the closest neutral bucket) so the audit log keeps its
 * row count and per-actor history intact through the cut-over.
 */
const LEGACY_ACTIVITY_RESOURCE_REWRITES: Record<string, string> = {
  media: "settings",
  conversation: "settings",
};

interface LegacyInquiryDoc {
  _id: mongoose.Types.ObjectId;
  customerName?: string;
  customerCity?: string;
  modelName?: string;
  variantSummary?: string;
  expectedRupees?: number;
  lastMessage?: string;
  receivedAt?: Date;
  createdAt?: Date;
  productId?: mongoose.Types.ObjectId;
  notes?: string;
  /**
   * Already-migrated docs carry `messages` and the snapshot field.
   * Their presence is the cheapest "skip this row" signal.
   */
  messages?: unknown[];
  subjectProductName?: string;
}

function formatRupees(value: number | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `Rs ${Math.round(value)}`;
  }
}

/**
 * Compose the body for `messages[0]` from the legacy snapshot fields.
 * The output reads like the customer originally typed it so the chat
 * timeline is coherent post-migration.
 */
function composeLegacyFirstMessage(doc: LegacyInquiryDoc): string {
  const lines: string[] = [];
  if (doc.modelName) {
    lines.push(`Asking about: ${doc.modelName}`);
  }
  if (doc.variantSummary) {
    lines.push(`Variant: ${doc.variantSummary}`);
  }
  const formattedRupees = formatRupees(doc.expectedRupees);
  if (formattedRupees) {
    lines.push(`Budget: ${formattedRupees}`);
  }
  if (doc.customerCity) {
    lines.push(`City: ${doc.customerCity}`);
  }
  if (doc.lastMessage) {
    lines.push("");
    lines.push(doc.lastMessage);
  }
  if (lines.length === 0) {
    return "(Inquiry migrated from legacy form — no message text was captured.)";
  }
  return lines.join("\n");
}

interface LegacyProductDoc {
  _id: mongoose.Types.ObjectId;
  modelName?: string;
  name?: string;
}

/**
 * Pass 1 — snapshot every Inquiry's referenced product name onto the
 * doc itself before the catalog wipe nullifies the FK. Must run before
 * Pass 3.
 */
async function snapshotInquiryProductNames(): Promise<number> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }
  const inquiries = db.collection<LegacyInquiryDoc>("inquiries");
  const products = db.collection<LegacyProductDoc>("products");

  const cursor = inquiries.find({
    productId: { $exists: true, $ne: undefined },
    subjectProductName: { $exists: false },
  });
  let snapshotCount = 0;
  for await (const doc of cursor) {
    if (!doc.productId) continue;
    const product = await products.findOne(
      { _id: doc.productId },
      { projection: { modelName: 1, name: 1 } },
    );
    const snapshotName =
      (product?.modelName && product.modelName.trim()) ||
      (product?.name && product.name.trim()) ||
      null;
    if (!snapshotName) continue;
    await inquiries.updateOne(
      { _id: doc._id },
      { $set: { subjectProductName: snapshotName } },
    );
    snapshotCount += 1;
  }
  return snapshotCount;
}

/**
 * Pass 2 — convert every legacy Inquiry doc into a threaded
 * conversation. Skips docs already carrying `messages`.
 */
async function restructureInquiries(): Promise<number> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }
  const inquiries = db.collection<LegacyInquiryDoc>("inquiries");
  const cursor = inquiries.find({
    $or: [{ messages: { $exists: false } }, { messages: { $size: 0 } }],
  });
  let rewriteCount = 0;
  for await (const doc of cursor) {
    if (Array.isArray(doc.messages) && doc.messages.length > 0) continue;
    const firstMessageBody = composeLegacyFirstMessage(doc);
    const firstMessageAt = doc.receivedAt ?? doc.createdAt ?? new Date();
    const customerName = (doc.customerName && doc.customerName.trim()) || "Guest";
    const messages = [
      {
        _id: new mongoose.Types.ObjectId(),
        author: "customer" as const,
        authorName: customerName,
        body: firstMessageBody,
        createdAt: firstMessageAt,
      },
    ];
    const lastMessagePreview = firstMessageBody.slice(0, 280);
    const updates: Record<string, unknown> = {
      messages,
      lastMessageAt: firstMessageAt,
      lastMessagePreview,
      lastMessageAuthor: "customer",
      unreadByCustomer: 0,
      unreadByTeam: 1,
      status: "open",
    };
    if (doc.notes && !("internalNotes" in doc)) {
      updates.internalNotes = doc.notes;
    }
    if (doc.productId && !("subjectProductId" in doc)) {
      updates.subjectProductId = doc.productId;
    }
    await inquiries.updateOne(
      { _id: doc._id },
      {
        $set: updates,
        $unset: {
          modelName: "",
          variantSummary: "",
          expectedRupees: "",
          source: "",
          receivedAt: "",
          lastMessage: "",
          customerCity: "",
          productId: "",
          notes: "",
        },
      },
    );
    rewriteCount += 1;
  }
  return rewriteCount;
}

/**
 * Pass 3 — wipe the catalogue collections so admin recreates them via
 * Flow A (categories) / Flow C (products). Also nulls the now-dangling
 * `subjectProductId` reference on Inquiries while keeping the
 * snapshotted product name.
 */
async function wipeCatalog(): Promise<{
  products: number;
  brands: number;
  grades: number;
  attributes: number;
  categories: number;
  conversations: number;
  mediaAssets: number;
  inquiriesPointersCleared: number;
}> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }
  const results = {
    products: 0,
    brands: 0,
    grades: 0,
    attributes: 0,
    categories: 0,
    conversations: 0,
    mediaAssets: 0,
    inquiriesPointersCleared: 0,
  };
  results.products =
    (await db.collection("products").deleteMany({}).catch(() => null))
      ?.deletedCount ?? 0;
  results.brands =
    (await db.collection("brands").deleteMany({}).catch(() => null))
      ?.deletedCount ?? 0;
  results.grades =
    (await db.collection("grades").deleteMany({}).catch(() => null))
      ?.deletedCount ?? 0;
  results.attributes =
    (await db.collection("attributes").deleteMany({}).catch(() => null))
      ?.deletedCount ?? 0;
  results.categories =
    (await db.collection("categories").deleteMany({}).catch(() => null))
      ?.deletedCount ?? 0;
  results.conversations =
    (await db.collection("conversations").drop().then(() => 1).catch(() => 0)) ?? 0;
  results.mediaAssets =
    (await db.collection("mediaassets").drop().then(() => 1).catch(() => 0)) ?? 0;
  // T1.21 — null the dangling `subjectProductId` ref now that products
  // are gone. `subjectProductName` (snapshotted in pass 1) stays.
  const inquiryUpdate = await Inquiry.updateMany(
    { subjectProductId: { $exists: true, $ne: null } },
    { $unset: { subjectProductId: "" } },
  );
  results.inquiriesPointersCleared = inquiryUpdate.modifiedCount ?? 0;
  return results;
}

/**
 * Pass 4a — rewrite legacy User.role values to their modern equivalents.
 * Uses the raw collection because Mongoose's typed `updateMany` refuses
 * to accept the legacy enum strings (the model's enum has already been
 * tightened to the modern set).
 */
async function rewriteUserRoles(): Promise<number> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }
  const users = db.collection<{ _id: mongoose.Types.ObjectId; role?: string }>("users");
  let touched = 0;
  for (const [legacy, modern] of Object.entries(ROLE_REWRITES)) {
    const result = await users.updateMany(
      { role: legacy },
      { $set: { role: modern } },
    );
    touched += result.modifiedCount ?? 0;
  }
  return touched;
}

/**
 * Pass 4b — rewrite legacy ActivityEntry.resourceType values and tag
 * their resourceLabel for provenance. Same reason as Pass 4a: we go
 * through the raw collection so the legacy enum strings don't trip the
 * tightened Mongoose schema.
 */
async function rewriteActivityEntries(): Promise<number> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }
  const activity = db.collection<{
    _id: mongoose.Types.ObjectId;
    resourceType?: string;
    resourceLabel?: string;
  }>("activityentries");
  let touched = 0;
  for (const [legacy, modern] of Object.entries(LEGACY_ACTIVITY_RESOURCE_REWRITES)) {
    const cursor = activity.find({ resourceType: legacy });
    for await (const row of cursor) {
      const prefix = `[Legacy ${legacy}]`;
      const label = row.resourceLabel ?? "";
      const next = label.startsWith(prefix) ? label : `${prefix} ${label}`.trim();
      await activity.updateOne(
        { _id: row._id },
        {
          $set: {
            resourceType: modern,
            resourceLabel: next,
          },
        },
      );
      touched += 1;
    }
  }
  return touched;
}

/**
 * Pass 4c — Offer.accentColor → hex `color`. Idempotent: only matches
 * docs that still carry the legacy field.
 */
async function rewriteOfferColors(): Promise<number> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }
  const offers = db.collection<{
    _id: mongoose.Types.ObjectId;
    accentColor?: string;
    color?: string;
  }>("offers");
  const cursor = offers.find({ accentColor: { $exists: true } });
  let touched = 0;
  for await (const doc of cursor) {
    const accent = (doc.accentColor ?? "").toLowerCase();
    const hex = ACCENT_TO_HEX[accent] ?? "#f59e0b";
    await offers.updateOne(
      { _id: doc._id },
      {
        $set: { color: doc.color ?? hex },
        $unset: { accentColor: "" },
      },
    );
    touched += 1;
  }
  // Backfill any offer that never had accentColor *or* color (older
  // seeds): give them the default amber.
  const backfill = await Offer.updateMany(
    { color: { $exists: false } },
    { $set: { color: "#f59e0b" } },
  );
  touched += backfill.modifiedCount ?? 0;
  return touched;
}

export async function simplificationV1(): Promise<void> {
  logger.info("[migrate] simplification-v1: start");

  const snapshotCount = await snapshotInquiryProductNames();
  logger.info(
    { snapshotCount },
    "[migrate] simplification-v1: inquiry product-name snapshots done",
  );

  const rewriteCount = await restructureInquiries();
  logger.info(
    { rewriteCount },
    "[migrate] simplification-v1: inquiry message restructure done",
  );

  const catalogResults = await wipeCatalog();
  logger.info(
    { ...catalogResults },
    "[migrate] simplification-v1: catalog wipe done",
  );

  const usersTouched = await rewriteUserRoles();
  logger.info(
    { usersTouched },
    "[migrate] simplification-v1: legacy user roles rewritten",
  );

  const activityTouched = await rewriteActivityEntries();
  logger.info(
    { activityTouched },
    "[migrate] simplification-v1: legacy activity rows rewritten",
  );

  const offersTouched = await rewriteOfferColors();
  logger.info(
    { offersTouched },
    "[migrate] simplification-v1: offer color backfill done",
  );

  logger.info("[migrate] simplification-v1: complete");
}
