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
