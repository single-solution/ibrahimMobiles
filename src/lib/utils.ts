import clsx, { type ClassValue } from "clsx";
import type { BatteryRange } from "@/types";

export function classNames(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatPrice(rupees: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(rupees);
  return `Rs ${formatted}`;
}

export function formatBatteryRange(range: BatteryRange): string {
  if (range.minPercent === range.maxPercent) {
    return `${range.minPercent}%`;
  }
  return `${range.minPercent}–${range.maxPercent}%`;
}

export function formatStorage(storageGb: number): string {
  return storageGb >= 1024 ? `${storageGb / 1024} TB` : `${storageGb} GB`;
}

export function calculateDiscountPercent(originalRupees: number, currentRupees: number): number {
  if (originalRupees <= 0 || currentRupees >= originalRupees) {
    return 0;
  }
  return Math.round(((originalRupees - currentRupees) / originalRupees) * 100);
}

export function formatRelativeDate(isoString: string): string {
  const target = new Date(isoString);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 1) {
    return `Ends in ${diffDays} days`;
  }
  if (diffDays === 1) {
    return "Ends tomorrow";
  }
  if (diffDays === 0) {
    return "Ends today";
  }
  return "Expired";
}

export function formatTimeAgo(isoString: string, referenceIso?: string): string {
  const target = new Date(isoString).getTime();
  const reference = referenceIso ? new Date(referenceIso).getTime() : Date.now();
  const diffMs = reference - target;
  if (Number.isNaN(diffMs)) {
    return "";
  }

  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks}w ago`;
  }

  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }

  const diffYears = Math.round(diffDays / 365);
  return `${diffYears}y ago`;
}
