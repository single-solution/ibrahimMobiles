import mongoose, { Schema, type Model } from "mongoose";

export const ACTIVITY_ACTIONS = [
  "created",
  "updated",
  "deleted",
  "archived",
  "restored",
  "status_changed",
  "login",
  "logout",
  "invited",
  "signin_code_issued",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

/**
 * Resource types the audit log can record. Phase 1 drops `"media"` and
 * `"conversation"` (both features were removed in T0.6); adds
 * `"attribute"` for the new per-category attribute authoring surface.
 *
 * Migration step T1.22 rewrites legacy `"media"` / `"conversation"`
 * rows to `"settings"` (closest neutral bucket) and prefixes their
 * `resourceLabel` with `[Legacy media]` / `[Legacy conversation]` so
 * provenance is preserved without dragging a dead enum forward.
 *
 * Order constraint: deploying this schema before T1.22 runs would
 * reject every legacy activity row with a mongoose enum validation
 * error. The Phase 1 migration commit ships them together.
 */
export const ACTIVITY_RESOURCE_TYPES = [
  "product",
  "brand",
  "category",
  "grade",
  "attribute",
  "order",
  "customer",
  "loyalty",
  "inquiry",
  "offer",
  "team",
  "settings",
  "auth",
] as const;
export type ActivityResourceType = (typeof ACTIVITY_RESOURCE_TYPES)[number];

interface ActivityEntryAttributes {
  actorUserId?: mongoose.Types.ObjectId;
  actorName: string;
  actorRole: string;
  action: ActivityAction;
  resourceType: ActivityResourceType;
  resourceId?: string;
  resourceLabel: string;
  detail?: string;
}

const activityEntrySchema = new Schema<ActivityEntryAttributes>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, required: true, trim: true },
    actorRole: { type: String, required: true, trim: true },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true, index: true },
    resourceType: { type: String, enum: ACTIVITY_RESOURCE_TYPES, required: true, index: true },
    resourceId: { type: String, trim: true, index: true },
    resourceLabel: { type: String, required: true, trim: true },
    detail: { type: String, trim: true, maxlength: 2_000 },
  },
  { timestamps: true },
);

activityEntrySchema.index({ createdAt: -1 });

export const ActivityEntry: Model<ActivityEntryAttributes> =
  (mongoose.models.ActivityEntry as Model<ActivityEntryAttributes>) ??
  mongoose.model<ActivityEntryAttributes>("ActivityEntry", activityEntrySchema);
