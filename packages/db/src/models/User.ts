import mongoose, { Schema, type Model } from "mongoose";

/** Roles available in the admin console. Permissions per role are resolved in `lib/permissions.ts`. */
export const USER_ROLES = ["owner", "manager", "staff"] as const;
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
  createdAt: Date;
  updatedAt: Date;
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
      default: "staff",
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
