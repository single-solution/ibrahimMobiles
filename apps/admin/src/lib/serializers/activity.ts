import type { Types } from "mongoose";
import type { AdminActivityEntry } from "@/types/admin";
import type { ActivityAction, ActivityResourceType } from "@store/db";

export interface ActivityEntryLean {
  _id: Types.ObjectId;
  actorUserId?: Types.ObjectId;
  actorName: string;
  actorRole: string;
  action: ActivityAction;
  resourceType: ActivityResourceType;
  resourceId?: string;
  resourceLabel: string;
  detail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toActivityResponse(doc: ActivityEntryLean): AdminActivityEntry {
  return {
    id: doc._id.toString(),
    actorUserId: doc.actorUserId ? doc.actorUserId.toString() : undefined,
    actorName: doc.actorName,
    actorRole: doc.actorRole,
    action: doc.action,
    resourceType: doc.resourceType,
    resourceId: doc.resourceId,
    resourceLabel: doc.resourceLabel,
    detail: doc.detail,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
