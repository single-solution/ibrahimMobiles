import mongoose, { Schema, type Model } from "mongoose";

/**
 * Roles available in the admin console. Permissions per role are
 * resolved in `apps/admin/src/lib/permissions.ts`.
 *
 * Phase 1 retires the legacy aliases `"manager"` / `"staff"` /
 * `"media_manager"`. The T1.22 migration step rewrites every existing
 * `User.role` document to the modern equivalents *before* this
 * tightened enum is loaded:
 *   - `manager`         → `business_manager`
 *   - `staff`           → `support_staff`
 *   - `media_manager`   → `product_manager`
 *
 * Order constraint: deploying this schema before T1.22 runs would
 * reject every legacy user with a mongoose enum validation error. The
 * Phase 1 migration commit ships them together.
 */
export const USER_ROLES = [
  "owner",
  "business_manager",
  "product_manager",
  "marketing_manager",
  "support_staff",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

interface UserAttributes {
  email: string;
  passwordHash: string;
  name: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
}

const userSchema = new Schema<UserAttributes>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    phoneNumber: {
      type: String,
      trim: true,
      maxlength: 32,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "support_staff",
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isSuperAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true },
);

export const User: Model<UserAttributes> =
  (mongoose.models.User as Model<UserAttributes>) ?? mongoose.model<UserAttributes>("User", userSchema);
