/**
 * Pluggable OTP delivery provider.
 */

import { getIntegrationSettings } from "@store/db";
import { logger } from "@store/shared";

import { createConnectivityPkOtpProvider } from "@/lib/otp/connectivityPkProvider";

export interface OtpDeliveryRequest {
	phoneFingerprint: string;
	phoneRaw: string;
	code: string;
	expiresInMinutes: number;
	brand: string;
}

export interface OtpProvider {
	readonly id: string;
	send(request: OtpDeliveryRequest): Promise<void>;
}

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
			`[OTP] ${brand} WhatsApp verification code: ${code} (Console fallback — would deliver to ${phoneRaw})`,
		);
	},
};

export async function getOtpProvider(): Promise<OtpProvider> {
	const settings = await getIntegrationSettings();
	const explicit = settings.otpProvider === "auto" ? (process.env.OTP_PROVIDER ?? "").toLowerCase() : settings.otpProvider;

	if (explicit === "connectivity-pk" || explicit === "connectivity" || explicit === "whatsapp") {
		const conn = createConnectivityPkOtpProvider(settings);
		if (!conn) {
			if (process.env.NODE_ENV !== "production") {
				logger.warn("Connectivity.pk selected but API Key is missing. Falling back to console OTP.");
				return consoleProvider;
			}
			throw new Error("Connectivity.pk WhatsApp OTP selected but API Key is missing in Admin → Settings → Integrations.");
		}
		return conn;
	}

	if (explicit === "console") {
		if (process.env.NODE_ENV === "production") {
			throw new Error("Console OTP provider is disabled in production. Configure Connectivity.pk under Admin → Settings → Integrations.");
		}
		return consoleProvider;
	}

	const conn = createConnectivityPkOtpProvider(settings);
	if (conn) {
		logger.info({ provider: conn.id }, "OTP provider auto-selected: Connectivity.pk WhatsApp Gateway");
		return conn;
	}

	if (process.env.NODE_ENV === "production") {
		throw new Error("OTP delivery is not configured. Add Connectivity.pk credentials in Admin → Settings → Integrations.");
	}
	return consoleProvider;
}
