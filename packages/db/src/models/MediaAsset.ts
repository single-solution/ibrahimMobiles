import mongoose, { Schema, type Model } from "mongoose";

import { FIELD_LIMITS } from "@store/shared";

export const MEDIA_KINDS = ["image", "video", "document"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Cap on the original `fileName` we keep alongside the URL — same limit as
 *  alt-text since both are short single-line strings. */
const FILE_NAME_MAX_CHARS = FIELD_LIMITS.imageAlt;
/** Cap on the MIME `contentType` string, e.g. `image/jpeg`. */
const CONTENT_TYPE_MAX_CHARS = 120;

interface MediaAssetAttributes {
  url: string;
  kind: MediaKind;
  title: string;
  alt?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  tags: string[];
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema = new Schema<MediaAssetAttributes>(
  {
    url: { type: String, required: true, trim: true, maxlength: FIELD_LIMITS.mediaUrl },
    kind: { type: String, enum: MEDIA_KINDS, required: true, default: "image" },
    title: { type: String, required: true, trim: true, maxlength: FIELD_LIMITS.mediumText },
    alt: { type: String, trim: true, maxlength: FIELD_LIMITS.imageAlt },
    fileName: { type: String, trim: true, maxlength: FILE_NAME_MAX_CHARS },
    contentType: { type: String, trim: true, maxlength: CONTENT_TYPE_MAX_CHARS },
    sizeBytes: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    tags: { type: [String], default: [] },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

mediaAssetSchema.index({ tags: 1, createdAt: -1 });
mediaAssetSchema.index({ kind: 1, createdAt: -1 });

export const MediaAsset: Model<MediaAssetAttributes> =
  (mongoose.models.MediaAsset as Model<MediaAssetAttributes>) ??
  mongoose.model<MediaAssetAttributes>("MediaAsset", mediaAssetSchema);
