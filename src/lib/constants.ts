export const SITE_NAME = "Ibrahim Mobile Store";
export const SITE_TAGLINE = "Pakistan's most trusted pre-owned phone store.";

export const STORE_ADDRESS_LINE_1 = "Arif Centre, Hall Road";
export const STORE_ADDRESS_LINE_2 = "Lahore, Pakistan";
export const STORE_HOURS = "Mon–Sat · 11 AM – 9 PM";

export const SUPPORT_PHONE = "+92 320 4862403";
export const SUPPORT_LANDLINE = "+92 42 37245459";
export const SUPPORT_EMAIL = "alyaschudry@gmail.com";
export const WHATSAPP_NUMBER = "923204862403";

export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/p/Ibrahim-Mobile-Store-100095570557900/",
  instagram: "https://www.instagram.com/ibrahimmobilestore",
  tiktok: "https://www.tiktok.com/@ibrahimmobilestore",
  youtube: "https://youtube.com/@ibrahimmobilestore",
  googleMaps: "https://maps.app.goo.gl/xzQQDXBdV6R4JXP98",
} as const;

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const FREE_DELIVERY_THRESHOLD_RUPEES = 50_000;
export const DEFAULT_WARRANTY_MONTHS = 6;
export const BANK_TRANSFER_DISCOUNT_PERCENT = 5;
export const MONEYBACK_DAYS = 15;

export const SERVICE_CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Hyderabad",
] as const;

export const PAYMENT_METHODS = [
  { id: "bank", label: "Bank Transfer", note: "Pay full → 5% off" },
  { id: "easypaisa", label: "Easypaisa", note: "Advance to confirm order" },
  { id: "jazzcash", label: "JazzCash", note: "Advance to confirm order" },
  { id: "cod", label: "Cash on Delivery", note: "Lahore only · in-person verify" },
] as const;

export const STORAGE_OPTIONS = [64, 128, 256, 512, 1024] as const;

export const RAM_OPTIONS = [4, 6, 8, 12, 16] as const;

export const PRICE_FILTER_BUCKETS = [
  { id: "under-50k", label: "Under Rs 50,000", maxRupees: 50_000 },
  { id: "50-100k", label: "Rs 50,000 – 1 Lakh", minRupees: 50_000, maxRupees: 100_000 },
  { id: "100-200k", label: "Rs 1 – 2 Lakh", minRupees: 100_000, maxRupees: 200_000 },
  { id: "200k-plus", label: "Rs 2 Lakh & above", minRupees: 200_000 },
] as const;
