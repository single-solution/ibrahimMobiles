/**
 * Connectivity.pk WhatsApp OTP delivery provider.
 *
 * Dispatches verification codes via Connectivity.pk WhatsApp Gateway API
 * to Pakistani mobile numbers (923XXXXXXXXX).
 */

import type { IntegrationSettingsValues } from "@store/shared";
import { logger } from "@store/shared";
import type { OtpDeliveryRequest, OtpProvider } from "@/lib/otp/provider";

function formatPakistanWhatsAppNumber(rawPhone: string): string {
	const digits = rawPhone.replace(/\D/g, "");
	if (digits.startsWith("92") && digits.length === 12) {
		return digits;
	}
	if (digits.startsWith("03") && digits.length === 11) {
		return `92${digits.slice(1)}`;
	}
	if (digits.startsWith("3") && digits.length === 10) {
		return `92${digits}`;
	}
	return digits;
}

class ConnectivityPkOtpProvider implements OtpProvider {
	readonly id = "connectivity-pk";
	private readonly apiKey: string;
	private readonly apiUrl: string;
	private readonly senderId: string;
	private readonly messageTemplate: string;

	constructor(settings: IntegrationSettingsValues) {
		this.apiKey = settings.connectivityApiKey.trim() || (process.env.CONNECTIVITY_API_KEY ?? "").trim();
		this.apiUrl = settings.connectivityApiUrl.trim() || (process.env.CONNECTIVITY_API_URL ?? "").trim() || "https://connectivity.pk/api/send-whatsapp";
		this.senderId = settings.connectivitySenderId.trim() || (process.env.CONNECTIVITY_SENDER_ID ?? "").trim() || "IbrahimMob";
		this.messageTemplate = settings.connectivityOtpMessage.trim() || "Your Ibrahim Mobiles verification code is {{code}}. Valid for {{minutes}} minutes.";
	}

	async send({ phoneRaw, code, expiresInMinutes, brand }: OtpDeliveryRequest): Promise<void> {
		if (!this.apiKey) {
			throw new Error("Connectivity.pk API Key is missing. Please enter it in Admin → Settings → Integrations.");
		}

		const formattedPhone = formatPakistanWhatsAppNumber(phoneRaw);
		const message = this.messageTemplate
			.replace(/\{\{code\}\}/g, code)
			.replace(/\{\{minutes\}\}/g, String(expiresInMinutes))
			.replace(/\{\{brand\}\}/g, brand);

		const payload = {
			api_key: this.apiKey,
			token: this.apiKey,
			api_token: this.apiKey,
			instance_id: this.senderId,
			sender: this.senderId,
			receiver: formattedPhone,
			recipient: formattedPhone,
			number: formattedPhone,
			phone: formattedPhone,
			message,
			msg: message,
			type: "text",
		};

		logger.info(
			{
				phone: formattedPhone,
				provider: this.id,
				apiUrl: this.apiUrl,
			},
			`[OTP] Dispatching WhatsApp OTP via Connectivity.pk to ${formattedPhone}`,
		);

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
			"X-Requested-With": "XMLHttpRequest",
			Authorization: `Bearer ${this.apiKey}`,
		};

		// 1. Try standard JSON POST with Bearer and XMLHttpRequest headers
		let response = await fetch(this.apiUrl, {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(10_000),
		});

		// 2. If 419 (CSRF) or 415 returned, retry with URL-encoded form data
		if (response.status === 419 || response.status === 415) {
			const formBody = new URLSearchParams();
			for (const [k, v] of Object.entries(payload)) {
				formBody.append(k, String(v));
			}

			response = await fetch(this.apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Accept: "application/json",
					"X-Requested-With": "XMLHttpRequest",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: formBody.toString(),
				signal: AbortSignal.timeout(10_000),
			});
		}

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			logger.error(
				{
					status: response.status,
					statusText: response.statusText,
					body: errorText,
					phone: formattedPhone,
				},
				"Connectivity.pk WhatsApp OTP API call failed",
			);
			throw new Error(`Connectivity.pk gateway returned status ${response.status}: ${errorText || response.statusText}`);
		}

		const resJson = (await response.json().catch(() => ({}))) as Record<string, unknown>;
		logger.info({ phone: formattedPhone, response: resJson }, "Connectivity.pk WhatsApp OTP delivered successfully");
	}
}

export function createConnectivityPkOtpProvider(settings: IntegrationSettingsValues): OtpProvider | null {
	const key = settings.connectivityApiKey.trim() || (process.env.CONNECTIVITY_API_KEY ?? "").trim();
	if (!key) {
		return null;
	}
	return new ConnectivityPkOtpProvider(settings);
}
