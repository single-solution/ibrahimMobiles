import type { Types } from "mongoose";
import type { AdminSetting } from "@/types/admin";

export interface SettingLean {
  _id: Types.ObjectId;
  key: string;
  value: unknown;
  description?: string;
  group?: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export function toSettingResponse(doc: SettingLean): AdminSetting {
  return {
    id: doc._id.toString(),
    key: doc.key,
    value: doc.value,
    description: doc.description,
    group: doc.group,
    updatedById: doc.updatedBy ? doc.updatedBy.toString() : undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
