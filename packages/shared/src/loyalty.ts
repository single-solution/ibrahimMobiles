/**
 * Loyalty Points — central configuration and math helpers shared by the
 * storefront UI, checkout flow, and admin panel.
 */

export const LOYALTY_PROGRAM_NAME = "Loyalty Points";

const POINT_LABEL_SINGULAR = "point";
const POINT_LABEL_PLURAL = "points";

/** Denominator used by every percent-based loyalty calculation. */
const PERCENT_DENOMINATOR = 100;

/** % of order total returned as points (e.g. 1 → 1% back). */
const LOYALTY_EARN_PERCENT = 1;

/** Conversion rate: 1 point = N rupees of redemption value. */
export const LOYALTY_POINT_TO_RUPEE = 1;

/** Max share of subtotal that can be paid with points (e.g. 20 → 20%). */
export const LOYALTY_MAX_REDEEM_PERCENT = 20;

/** Minimum redemption per order to keep the UI tidy. */
export const LOYALTY_MIN_REDEEM = 100;

interface LoyaltyEarnRule {
  id: string;
  label: string;
  description: string;
  reward: string;
}

export const LOYALTY_EARN_RULES: LoyaltyEarnRule[] = [
  {
    id: "purchase",
    label: "Every purchase",
    description: `Earn ${LOYALTY_EARN_PERCENT} ${POINT_LABEL_PLURAL} for every Rs ${PERCENT_DENOMINATOR} spent.`,
    reward: `${LOYALTY_EARN_PERCENT}% back`,
  },
  {
    id: "review",
    label: "Review your phone",
    description: "Drop a quick review after delivery and we'll add bonus points.",
    reward: "+ 200 pts",
  },
  {
    id: "refer",
    label: "Refer a friend",
    description: "Both of you earn when their first order ships.",
    reward: "+ 1,500 pts each",
  },
];

/** Compute how many points an order earns based on its total (or subtotal). */
export function pointsEarnedFor(rupees: number): number {
  if (rupees <= 0) {
    return 0;
  }
  return Math.floor((rupees * LOYALTY_EARN_PERCENT) / PERCENT_DENOMINATOR);
}

/** Convert a points value into its rupee equivalent at the configured rate. */
export function pointsToRupees(points: number): number {
  return Math.max(0, Math.floor(points * LOYALTY_POINT_TO_RUPEE));
}

/**
 * Max points that can be applied to a given order, capped by balance and the
 * MAX_REDEEM_PERCENT cap on subtotal.
 */
export function maxRedeemable(subtotalRupees: number, balance: number): number {
  const cap = Math.floor((subtotalRupees * LOYALTY_MAX_REDEEM_PERCENT) / PERCENT_DENOMINATOR);
  const capInPoints = Math.max(0, Math.ceil(cap / LOYALTY_POINT_TO_RUPEE));
  return Math.max(0, Math.min(balance, capInPoints));
}

/** Format with thousand separators + label, e.g. 1,234 points. */
export function formatPoints(value: number): string {
  const absolute = Math.abs(value);
  const formatted = absolute.toLocaleString("en-PK");
  const label = absolute === 1 ? POINT_LABEL_SINGULAR : POINT_LABEL_PLURAL;
  return `${value < 0 ? "−" : ""}${formatted} ${label}`;
}
