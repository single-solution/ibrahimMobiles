/**
 * Pluggable OTP delivery provider.
 *
 * Resolution order:
 *   1. Explicit `OTP_PROVIDER` env var — use the named provider, no fallback.
 *   2. `OTP_PROVIDER` unset (default):
 *        - Twilio when configured — WhatsApp first; SMS only if the number is
 *          not on WhatsApp (Twilio error 63024).
 *        - Otherwise the console provider (dev / preview only).
 *
 * Keep secrets and HTTP calls inside concrete providers — never in the
 * surrounding code paths.
 */

import { logger } from "@store/shared";
import { createTwilioOtpProviderFromEnv } from "@/lib/otp/twilioProvider";

export interface OtpDeliveryRequest {
	phoneFingerprint: string;
	phoneRaw: string;
	/** The plain-text 6-digit code (never persist this anywhere). */
	code: string;
	/** Minutes the code stays valid — used in the message body. */
	expiresInMinutes: number;
	/** Sender name / brand for the message body. */
	brand: string;
}

export interface OtpProvider {
	readonly id: string;
	send(request: OtpDeliveryRequest): Promise<void>;
}

/**
 * Console provider — prints the code to the server log. Good for dev /
 * preview environments where there's no SMS gateway.
 */
const consoleProvider: OtpProvider = {
	id: "console",
	async send({ phoneRaw, code, expiresInMinutes, brand }) {
		logger.info(
			{
				phone: phoneRaw,
				code,
				expiresInMinutes,
				brand,
			},
			`[OTP] ${brand} verification code (dev provider — would deliver to ${phoneRaw})`,
		);
	},
};

let cachedProvider: OtpProvider | null = null;

/** Resolve the provider once — picks based on `OTP_PROVIDER` + env presence. */
export function getOtpProvider(): OtpProvider {
	if (cachedProvider) {
		return cachedProvider;
	}

	const explicit = (process.env.OTP_PROVIDER ?? "").toLowerCase();

	if (explicit === "twilio") {
		const twilio = createTwilioOtpProviderFromEnv();
		if (!twilio) {
			throw new Error("OTP_PROVIDER=twilio but Twilio env vars are missing. " + "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.");
		}
		cachedProvider = twilio;
		return cachedProvider;
	}

	if (explicit === "console") {
		cachedProvider = consoleProvider;
		return cachedProvider;
	}

	// Default: prefer Twilio when configured; otherwise fall back to console
	// so dev / preview installs don't break.
	const twilio = createTwilioOtpProviderFromEnv();
	if (twilio) {
		logger.info("OTP provider auto-selected: twilio");
		cachedProvider = twilio;
		return cachedProvider;
	}

	if (process.env.NODE_ENV === "production") {
		throw new Error("OTP delivery is not configured for production. Set OTP_PROVIDER=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.");
	}
	cachedProvider = consoleProvider;
	return cachedProvider;
}
