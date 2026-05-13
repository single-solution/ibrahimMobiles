export type ConditionGrade = "A+" | "A" | "B" | "C";

export type StorageOption = 64 | 128 | 256 | 512 | 1024;

export type StockType =
  | "brand-new"
  | "genuine"
  | "box-open"
  | "refurbished"
  | "china-water"
  | "lcd-shaded";

export interface Brand {
  slug: string;
  name: string;
  tagline: string;
  phoneCount: number;
}

export interface BatteryRange {
  minPercent: number;
  maxPercent: number;
}

export interface PhoneVariant {
  id: string;
  stockType: StockType;
  grade: ConditionGrade;
  storageGb: StorageOption;
  ramGb: number;
  colorName: string;
  priceRupees: number;
  originalPriceRupees: number;
  batteryHealthRange: BatteryRange;
  isPtaApproved: boolean;
  isInStock: boolean;
  warrantyMonths: number;
  notes?: string;
}

export interface Phone {
  id: string;
  slug: string;
  brandSlug: string;
  modelName: string;

  imageUrl: string;
  galleryUrls: string[];

  releaseYear: number;
  highlights: string[];

  isFeatured: boolean;

  variants: PhoneVariant[];
}

export interface Offer {
  id: string;
  slug: string;
  title: string;
  description: string;
  discountLabel: string;
  expiresAt: string;
  accentColor: "emerald" | "amber" | "rose" | "sky";
  badgeLabel: string;
}

export interface GradeDescriptor {
  grade: ConditionGrade;
  shortLabel: string;
  description: string;
  cosmeticNotes: string;
  functionalNotes: string;
}

export interface StockTypeDescriptor {
  stockType: StockType;
  label: string;
  shortLabel: string;
  description: string;
  tone: "accent" | "neutral" | "info" | "warn" | "danger" | "dark";
}

export interface Testimonial {
  id: string;
  customerName: string;
  customerCity: string;
  rating: number;
  body: string;
  purchasedModel: string;
}
