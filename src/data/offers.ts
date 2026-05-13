import type { Offer } from "@/types";

export const offers: Offer[] = [
  {
    id: "offer-eid-bundle",
    slug: "eid-bundle",
    title: "Eid Bundle",
    description: "Buy any Grade A+ iPhone and get a free original-style case + tempered glass + a 1-year screen protection plan.",
    discountLabel: "Free accessories worth Rs 8,500",
    expiresAt: getRelativeIso(7),
    accentColor: "emerald",
    badgeLabel: "Limited",
  },
  {
    id: "offer-flagship-friday",
    slug: "flagship-friday",
    title: "Flagship Friday",
    description: "Up to 22% off on all Galaxy S series and Pixel Pro phones — every Friday. Free delivery anywhere in Pakistan.",
    discountLabel: "Up to 22% off",
    expiresAt: getRelativeIso(2),
    accentColor: "amber",
    badgeLabel: "Weekly",
  },
  {
    id: "offer-bank-transfer",
    slug: "bank-transfer-discount",
    title: "Bank Transfer Discount",
    description: "Pay full price by bank transfer (HBL, Meezan, UBL, Bank Alfalah, all major Pakistani banks) and get 5% off your order — applied on the spot.",
    discountLabel: "Flat 5% off",
    expiresAt: getRelativeIso(20),
    accentColor: "sky",
    badgeLabel: "Always on",
  },
  {
    id: "offer-clearance",
    slug: "clearance",
    title: "Grade C Clearance",
    description: "Functional phones with cosmetic wear — perfect first phone for students or a backup device.",
    discountLabel: "Starting Rs 25,000",
    expiresAt: getRelativeIso(14),
    accentColor: "rose",
    badgeLabel: "Hot deal",
  },
];

function getRelativeIso(daysFromNow: number): string {
  const target = new Date();
  target.setDate(target.getDate() + daysFromNow);
  return target.toISOString();
}
