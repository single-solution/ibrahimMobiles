import mongoose, { Schema, type Model } from "mongoose";

interface SettingAttributes {
  key: string;
  value: unknown;
  description?: string;
  group?: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<SettingAttributes>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 160,
      index: true,
    },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, trim: true, maxlength: 600 },
    group: { type: String, trim: true, maxlength: 80, index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const Setting: Model<SettingAttributes> =
  (mongoose.models.Setting as Model<SettingAttributes>) ??
  mongoose.model<SettingAttributes>("Setting", settingSchema);
