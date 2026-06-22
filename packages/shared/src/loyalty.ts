/**
 * Loyalty Points — math helpers shared by storefront, checkout, and admin.
 * Earn/review/referral rates come from live `StoreSettings` at call sites.
 */
import type { StoreSettings } from "./storeSettings";

export const LOYALTY_PROGRAM_NAME = "Loyalty Points";

const POINT_LABEL_SINGULAR = "point";
const POINT_LABEL_PLURAL = "points";

/** Denominator used by every percent-based loyalty calculation. */
const PERCENT_DENOMINATOR = 100;

/** Conversion rate: 1 point = N rupees of redemption value. */
export const LOYALTY_POINT_TO_RUPEE = 1;

/** Max share of subtotal that can be paid with points (e.g. 20 → 20%). */
export const LOYALTY_MAX_REDEEM_PERCENT = 20;

/** Minimum redemption per order to keep the UI tidy. */
export const LOYALTY_MIN_REDEEM = 100;

export interface LoyaltyEarnRule {
	id: string;
	label: string;
	description: string;
	reward: string;
}

/**
 * Build the customer-facing "how you earn" list from live admin settings.
 * The numbers in the copy track whatever the admin saved (e.g. raising
 * the earn percent from 1% to 2% updates the chip text automatically).
 */
export function getLoyaltyEarnRules(settings: {
	loyaltyEarnPercent: StoreSettings["loyaltyEarnPercent"];
	loyaltyReviewBonusPoints: StoreSettings["loyaltyReviewBonusPoints"];
	loyaltyReferralBonusPoints: StoreSettings["loyaltyReferralBonusPoints"];
}): LoyaltyEarnRule[] {
	const earnPercent = Math.max(0, settings.loyaltyEarnPercent);
	const reviewBonus = Math.max(0, settings.loyaltyReviewBonusPoints);
	const referralBonus = Math.max(0, settings.loyaltyReferralBonusPoints);
	return [
		{
			id: "purchase",
			label: "Every purchase",
			description: `Earn ${earnPercent} ${POINT_LABEL_PLURAL} for every Rs ${PERCENT_DENOMINATOR} spent.`,
			reward: `${earnPercent}% back`,
		},
		{
			id: "review",
			label: "Review your phone",
			description: "Drop a quick review after delivery and we'll add bonus points.",
			reward: `+ ${formatPointsShort(reviewBonus)} pts`,
		},
		{
			id: "refer",
			label: "Refer a friend",
			description: "Both of you earn when their first order ships.",
			reward: `+ ${formatPointsShort(referralBonus)} pts each`,
		},
	];
}

/**
 * Compute how many points an order earns based on its total (or subtotal).
 * `earnPercent` is supplied by the caller (typically from `StoreSettings`)
 * so the math always matches the rate the admin saved.
 */
export function pointsEarnedFor(rupees: number, earnPercent: number): number {
	if (rupees <= 0) {
		return 0;
	}
	const safePercent = Math.max(0, earnPercent);
	return Math.floor((rupees * safePercent) / PERCENT_DENOMINATOR);
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

/** Thousand-separated short form for inline chip copy ("1,500"). */
function formatPointsShort(value: number): string {
	return Math.max(0, value).toLocaleString("en-PK");
}
