import mongoose, { Schema, type Model } from "mongoose";
import { CONDITION_GRADES, type ConditionGrade } from "./Category";

export const GRADE_TONES = ["accent", "neutral", "info", "warn", "danger", "dark"] as const;
export type GradeTone = (typeof GRADE_TONES)[number];

export interface GradeAttributes {
  grade: ConditionGrade;
  label: string;
  shortLabel: string;
  description: string;
  cosmeticNotes: string;
  functionalNotes: string;
  tone: GradeTone;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const gradeSchema = new Schema<GradeAttributes>(
  {
    grade: {
      type: String,
      enum: CONDITION_GRADES,
      required: true,
      unique: true,
      index: true,
    },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    shortLabel: { type: String, required: true, trim: true, maxlength: 40 },
    description: { type: String, required: true, trim: true, maxlength: 400 },
    cosmeticNotes: { type: String, required: true, trim: true, maxlength: 400 },
    functionalNotes: { type: String, required: true, trim: true, maxlength: 400 },
    tone: { type: String, enum: GRADE_TONES, required: true, default: "neutral" },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

gradeSchema.index({ sortOrder: 1 });

export const Grade: Model<GradeAttributes> =
  (mongoose.models.Grade as Model<GradeAttributes>) ??
  mongoose.model<GradeAttributes>("Grade", gradeSchema);
