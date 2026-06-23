/**
 * Lightweight intent hints for fallback replies and logging.
 * The LLM still decides tool use; these patterns cover common Pakistani
 * storefront phrasing in English and Roman Urdu.
 */

const DEALS_PATTERN =
	/\b(deals?|offer(?:s)?|promo(?:tion)?s?|discount(?:s)?|sale(?:s)?|scheme|special(?:s)?|off(?:\s|$)|new\s+deal|koi\s+deal|koi\s+offer|discount\s+hai|sale\s+lag\s+rahi)\b/i;

const HUMAN_ESCALATION_PATTERN =
	/\b(human|person|real\s+person|someone|agent|representative|call\s+me|phone\s+call|speak\s+to|talk\s+to|manager|owner|complain|refund\s+now|lawyer|scam|fraud|insaan|banday?\s+se|bandi\s+se|kisi\s+se\s+baat|agent\s+se|manager\s+se|human\s+se)\b/i;

const ORDER_PATTERN = /\b(my\s+order|order\s+status|track(?:ing)?|delivery|parcel|mera\s+order|order\s+kahan|dispatch)\b/i;

const GREETING_ONLY_PATTERN = /^(?:hi|hello|hey|salam|aoa|assalam|good\s+(?:morning|afternoon|evening)|kia\s+hal|kaise?\s+ho)[!.?\s]*$/i;

const COMPARISON_SPLIT_PATTERN = /\s+(?:or|vs\.?|versus)\s+/i;

const COMPARISON_HINT_PATTERN =
	/\b(which\s+(?:one|phone|is\s+better|should\s+i)|compare|comparison|better\s+(?:one|phone|option)|konsa|kaun\s+sa|zyada\s+behtar)\b/i;

const PHONE_MODEL_PATTERN =
	/\b(iphone|pixel|samsung|galaxy|oneplus|oppo|vivo|xiaomi|poco|realme|infinix|tecno|nokia|huawei|motorola|ipad)\b|\d/i;

/** Split "pixel 9 pro or iphone 16 pro" into catalog search queries. */
export function extractComparisonQueries(message: string): string[] {
	const trimmed = message.trim().replace(/[?.!]+$/, "").trim();
	if (!COMPARISON_SPLIT_PATTERN.test(trimmed)) {
		return [];
	}
	return trimmed
		.split(COMPARISON_SPLIT_PATTERN)
		.map((part) => part.trim().replace(/^[,;]\s*/, ""))
		.filter((part) => part.length >= 3 && PHONE_MODEL_PATTERN.test(part))
		.slice(0, 3);
}

export function customerAskedProductComparison(message: string): boolean {
	if (extractComparisonQueries(message).length >= 2) {
		return true;
	}
	return COMPARISON_HINT_PATTERN.test(message) && PHONE_MODEL_PATTERN.test(message);
}

export function customerAskedAboutDeals(message: string): boolean {
	return DEALS_PATTERN.test(message);
}

export function customerAskedAboutOrders(message: string): boolean {
	return ORDER_PATTERN.test(message);
}

export function customerMessageIsGreetingOnly(message: string): boolean {
	return GREETING_ONLY_PATTERN.test(message.trim());
}

export function customerWantsHumanSupport(message: string): boolean {
	return HUMAN_ESCALATION_PATTERN.test(message);
}
