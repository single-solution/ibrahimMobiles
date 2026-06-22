/**
 * Detect when a customer likely wants a human teammate.
 * Used to keep `unreadByTeam` high and tune assistant tone.
 */

const HUMAN_ESCALATION_PATTERN = /\b(human|person|real person|someone|call me|phone call|speak to|talk to|manager|owner|complain|refund now|lawyer|scam|fraud)\b/i;

export function customerWantsHumanSupport(message: string): boolean {
	return HUMAN_ESCALATION_PATTERN.test(message);
}
