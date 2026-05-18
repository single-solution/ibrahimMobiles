import type { Types } from "mongoose";
import type { AdminMediaAsset } from "@/types/admin";
import type { MediaKind } from "@store/db";

export interface MediaAssetLean {
  _id: Types.ObjectId;
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
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export function toMediaAssetResponse(doc: MediaAssetLean): AdminMediaAsset {
  return {
    id: doc._id.toString(),
    url: doc.url,
    kind: doc.kind,
    title: doc.title,
    alt: doc.alt,
    fileName: doc.fileName,
    contentType: doc.contentType,
    sizeBytes: doc.sizeBytes,
    width: doc.width,
    height: doc.height,
    tags: doc.tags ?? [],
    uploadedById: doc.uploadedBy ? doc.uploadedBy.toString() : undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
