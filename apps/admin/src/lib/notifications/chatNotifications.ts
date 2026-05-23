import type { InquiryLean } from "@/lib/serializers/inquiry";

interface NotifyMessage {
  body: string;
  author: string;
}

/**
 * Post-MVP hook for email/SMS on new chat messages. Intentionally a no-op
 * until Resend/Twilio credentials are configured.
 */
export async function notifyOnNewMessage(
  _inquiry: InquiryLean,
  _message: NotifyMessage,
): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    // TODO: post-MVP — send agent/customer email via Resend
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    // TODO: post-MVP — send SMS via Twilio
  }
}
