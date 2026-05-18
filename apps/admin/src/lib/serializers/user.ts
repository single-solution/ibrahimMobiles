import type { Types } from "mongoose";
import type { AdminUser } from "@/types/admin";
import type { UserRole } from "@store/db";

export interface UserLean {
  _id: Types.ObjectId;
  email: string;
  name: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function toUserResponse(doc: UserLean): AdminUser {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phoneNumber: doc.phoneNumber,
    role: doc.role,
    isSuperAdmin: doc.isSuperAdmin,
    isActive: doc.isActive,
    lastSignInAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
