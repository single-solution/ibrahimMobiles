/**
 * Twilio WhatsApp error codes where SMS is an appropriate fallback channel.
 * See https://www.twilio.com/docs/api/errors/63024
 */

/** Recipient has no WhatsApp account or cannot receive WhatsApp messages. */
export const WHATSAPP_RECIPIENT_UNAVAILABLE_CODES = new Set<number>([63024]);

export function parseTwilioErrorCode(responseBody: string): number | null {
	if (!responseBody.trim()) {
		return null;
	}
	try {
		const parsed = JSON.parse(responseBody) as { code?: unknown };
		const code = parsed.code;
		if (typeof code === "number" && Number.isFinite(code)) {
			return code;
		}
		if (typeof code === "string" && /^\d+$/.test(code)) {
			return Number.parseInt(code, 10);
		}
	} catch {
		const match = responseBody.match(/"code"\s*:\s*(\d+)/);
		if (match?.[1]) {
			return Number.parseInt(match[1], 10);
		}
	}
	return null;
}

export function isWhatsAppRecipientUnavailableCode(errorCode: number | null): boolean {
	if (errorCode === null) {
		return false;
	}
	return WHATSAPP_RECIPIENT_UNAVAILABLE_CODES.has(errorCode);
}

export function isWhatsAppRecipientUnavailableError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	const twilioError = error as { twilioErrorCode?: number | null };
	if (typeof twilioError.twilioErrorCode === "number") {
		return isWhatsAppRecipientUnavailableCode(twilioError.twilioErrorCode);
	}
	const match = error.message.match(/\b(63024)\b/);
	return match !== null;
}
