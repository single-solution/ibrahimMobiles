/**
 * Connectivity.pk WhatsApp OTP delivery provider.
 *
 * Dispatches verification codes via Connectivity.pk WhatsApp REST API:
 * POST https://connectivity.pk/api/messages/chat
 * Headers: { 'content-type': 'application/x-www-form-urlencoded' }
 * Body: { instance_id, token, to, body }
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
	private readonly token: string;
	private readonly instanceId: string;
	private readonly apiUrl: string;
	private readonly messageTemplate: string;

	constructor(settings: IntegrationSettingsValues) {
		this.token = settings.connectivityApiKey.trim() || (process.env.CONNECTIVITY_API_KEY ?? "").trim();
		this.instanceId =
			settings.connectivitySenderId.trim() ||
			(process.env.CONNECTIVITY_SENDER_ID ?? "").trim() ||
			(process.env.CONNECTIVITY_INSTANCE_ID ?? "").trim();

		let rawUrl =
			settings.connectivityApiUrl.trim() ||
			(process.env.CONNECTIVITY_API_URL ?? "").trim() ||
			"https://connectivity.pk/api/messages/chat";

		// Auto-migrate legacy or erroneous endpoint to official Connectivity.pk endpoint
		if (rawUrl.includes("send-whatsapp")) {
			rawUrl = "https://connectivity.pk/api/messages/chat";
		}
		this.apiUrl = rawUrl;

		this.messageTemplate =
			settings.connectivityOtpMessage.trim() ||
			"Your Ibrahim Mobiles verification code is {{code}}. Valid for {{minutes}} minutes.";
	}

	async send({ phoneRaw, code, expiresInMinutes, brand }: OtpDeliveryRequest): Promise<void> {
		if (!this.token) {
			throw new Error("Connectivity.pk API Token is missing. Please enter it in Admin → Settings → Integrations.");
		}

		const formattedPhone = formatPakistanWhatsAppNumber(phoneRaw);
		const messageText = this.messageTemplate
			.replace(/\{\{code\}\}/g, code)
			.replace(/\{\{minutes\}\}/g, String(expiresInMinutes))
			.replace(/\{\{brand\}\}/g, brand);

		const formParams = new URLSearchParams();
		formParams.append("instance_id", this.instanceId);
		formParams.append("token", this.token);
		formParams.append("to", formattedPhone);
		formParams.append("body", messageText);

		logger.info(
			{
				to: formattedPhone,
				instance_id: this.instanceId || "<empty>",
				provider: this.id,
				apiUrl: this.apiUrl,
			},
			`[OTP] Dispatching WhatsApp OTP via Connectivity.pk (/api/messages/chat) to ${formattedPhone}`,
		);

		const response = await fetch(this.apiUrl, {
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				Accept: "application/json",
				"X-Requested-With": "XMLHttpRequest",
			},
			body: formParams.toString(),
			signal: AbortSignal.timeout(12_000),
		});

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
