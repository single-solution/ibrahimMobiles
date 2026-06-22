import type { InquiryLean } from "@/lib/serializers/inquiry";

interface NotifyMessage {
	body: string;
	author: string;
}

/**
 * Post-MVP hook for email/SMS on new chat messages. No-op until Resend/Twilio are wired.
 */
export async function notifyOnNewMessage(_inquiry: InquiryLean, _message: NotifyMessage): Promise<void> {
	if (process.env.RESEND_API_KEY) {
		// Resend email delivery not implemented yet.
	}
	if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
		// Twilio SMS delivery not implemented yet.
	}
}
