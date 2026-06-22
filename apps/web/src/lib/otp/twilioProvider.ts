/**
 * Twilio-backed OTP provider — WhatsApp first, SMS only when needed.
 *
 * Delivery policy:
 *   1. Send via WhatsApp (`TWILIO_WHATSAPP_FROM`).
 *   2. SMS (`TWILIO_SMS_FROM`) only when Twilio reports the recipient is not on
 *      WhatsApp (error 63024) — not on every WhatsApp failure.
 *   3. Template/config/network errors do not trigger SMS (avoids double sends
 *      and expensive SMS when WhatsApp would have worked on retry).
 *
 * Required for production:
 *   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
 *
 * SMS fallback (non-WhatsApp numbers):
 *   - `TWILIO_SMS_FROM` — used only after WhatsApp recipient-unavailable errors.
 *
 * Optional:
 *   - `OTP_DISABLE_SMS=1` — never send SMS, even when WhatsApp unavailable.
 *   - `OTP_DISABLE_WHATSAPP=1` + `TWILIO_SMS_FROM` — SMS-only mode.
 */

import type { OtpDeliveryRequest, OtpProvider } from "@/lib/otp/provider";
import { FIELD_LIMITS, logger, phoneFingerprint } from "@store/shared";

import { isWhatsAppRecipientUnavailableCode, isWhatsAppRecipientUnavailableError, parseTwilioErrorCode } from "@/lib/otp/twilioWhatsAppErrors";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";
const TWILIO_REQUEST_TIMEOUT_MS = 10_000;
const WHATSAPP_STATUS_POLL_INTERVAL_MS = 1_000;
const WHATSAPP_STATUS_POLL_ATTEMPTS = 4;

const WHATSAPP_TERMINAL_SUCCESS = new Set(["sent", "delivered", "read"]);
const WHATSAPP_TERMINAL_FAILURE = new Set(["failed", "undelivered"]);

class TwilioDeliveryError extends Error {
	readonly twilioErrorCode: number | null;

	constructor(
		public channel: "whatsapp" | "sms",
		public status: number,
		public body: string,
	) {
		super(`Twilio ${channel} delivery failed (HTTP ${status}): ${body.slice(0, FIELD_LIMITS.providerErrorPreview)}`);
		this.name = "TwilioDeliveryError";
		this.twilioErrorCode = parseTwilioErrorCode(body);
	}
}

function toPakistaniE164(raw: string): string | null {
	const fingerprint = phoneFingerprint(raw);
	if (!fingerprint) {
		return null;
	}
	if (!fingerprint.startsWith("3")) {
		return null;
	}
	return `+92${fingerprint}`;
}

function buildMessageBody(code: string, expiresInMinutes: number, brand: string): string {
	return [
		`Your ${brand} verification code is ${code}.`,
		`It expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.`,
		"Do not share this code with anyone.",
	].join("\n");
}

interface TwilioSendInput {
	accountSid: string;
	authToken: string;
	from: string;
	to: string;
	body: string;
	channel: "whatsapp" | "sms";
}

interface TwilioSendResult {
	messageSid: string;
}

function twilioAuthHeader(accountSid: string, authToken: string): string {
	return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

async function sendViaTwilio(input: TwilioSendInput): Promise<TwilioSendResult> {
	const params = new URLSearchParams({
		From: input.from,
		To: input.to,
		Body: input.body,
	});

	const url = `${TWILIO_API_BASE}/Accounts/${input.accountSid}/Messages.json`;

	let response: Response;
	try {
		response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: twilioAuthHeader(input.accountSid, input.authToken),
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
			signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
		});
	} catch (error) {
		throw new TwilioDeliveryError(input.channel, 0, String(error));
	}

	const text = await response.text().catch(() => "");
	if (!response.ok) {
		throw new TwilioDeliveryError(input.channel, response.status, text);
	}

	let messageSid = "";
	try {
		const parsed = JSON.parse(text) as { sid?: unknown };
		if (typeof parsed.sid === "string") {
			messageSid = parsed.sid;
		}
	} catch {
		// POST succeeded without a parseable sid — polling will be skipped.
	}

	return { messageSid };
}

interface TwilioMessageStatus {
	status: string;
	errorCode: number | null;
}

async function fetchTwilioMessageStatus(accountSid: string, authToken: string, messageSid: string): Promise<TwilioMessageStatus> {
	const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages/${messageSid}.json`;
	const response = await fetch(url, {
		method: "GET",
		headers: {
			Authorization: twilioAuthHeader(accountSid, authToken),
		},
		signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
	});
	const text = await response.text().catch(() => "");
	if (!response.ok) {
		throw new TwilioDeliveryError("whatsapp", response.status, text);
	}
	const parsed = JSON.parse(text) as { status?: unknown; error_code?: unknown };
	const status = typeof parsed.status === "string" ? parsed.status : "unknown";
	const rawErrorCode = parsed.error_code;
	const errorCode = typeof rawErrorCode === "number" ? rawErrorCode : typeof rawErrorCode === "string" && /^\d+$/.test(rawErrorCode) ? Number.parseInt(rawErrorCode, 10) : null;
	return { status, errorCode };
}

async function sleep(milliseconds: number): Promise<void> {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

async function waitForWhatsAppDeliveryOutcome(input: {
	accountSid: string;
	authToken: string;
	messageSid: string;
}): Promise<"delivered" | "recipient-unavailable" | "failed" | "pending"> {
	if (!input.messageSid) {
		return "pending";
	}

	for (let attempt = 0; attempt < WHATSAPP_STATUS_POLL_ATTEMPTS; attempt += 1) {
		if (attempt > 0) {
			await sleep(WHATSAPP_STATUS_POLL_INTERVAL_MS);
		}
		const messageStatus = await fetchTwilioMessageStatus(input.accountSid, input.authToken, input.messageSid);
		if (WHATSAPP_TERMINAL_SUCCESS.has(messageStatus.status)) {
			return "delivered";
		}
		if (WHATSAPP_TERMINAL_FAILURE.has(messageStatus.status)) {
			if (isWhatsAppRecipientUnavailableCode(messageStatus.errorCode)) {
				return "recipient-unavailable";
			}
			return "failed";
		}
	}
	return "pending";
}

function resolveSmsFrom(env: NodeJS.ProcessEnv, whatsAppFrom: string | null): string | null {
	if (env.OTP_DISABLE_SMS === "1") {
		return null;
	}
	const smsFrom = env.TWILIO_SMS_FROM?.trim() || null;
	if (!smsFrom) {
		return null;
	}
	if (env.OTP_DISABLE_WHATSAPP === "1" || !whatsAppFrom) {
		return smsFrom;
	}
	return smsFrom;
}

class TwilioOtpProvider implements OtpProvider {
	readonly id = "twilio";
	private readonly accountSid: string;
	private readonly authToken: string;
	private readonly whatsAppFrom: string | null;
	private readonly smsFrom: string | null;

	constructor(env: NodeJS.ProcessEnv) {
		const accountSid = env.TWILIO_ACCOUNT_SID;
		const authToken = env.TWILIO_AUTH_TOKEN;
		if (!accountSid || !authToken) {
			throw new Error("TwilioOtpProvider requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
		}
		this.accountSid = accountSid;
		this.authToken = authToken;
		this.whatsAppFrom = env.OTP_DISABLE_WHATSAPP === "1" ? null : (env.TWILIO_WHATSAPP_FROM?.trim() ?? null);
		this.smsFrom = resolveSmsFrom(env, this.whatsAppFrom);
		if (!this.whatsAppFrom && !this.smsFrom) {
			throw new Error("TwilioOtpProvider needs TWILIO_WHATSAPP_FROM (recommended) or TWILIO_SMS_FROM with OTP_DISABLE_WHATSAPP=1.");
		}
	}

	async send(request: OtpDeliveryRequest): Promise<void> {
		const e164 = toPakistaniE164(request.phoneRaw);
		if (!e164) {
			throw new Error(`Refusing to send OTP — "${request.phoneRaw}" is not a valid Pakistani mobile number.`);
		}
		const body = buildMessageBody(request.code, request.expiresInMinutes, request.brand);

		if (this.whatsAppFrom) {
			await this.sendWhatsAppOrFallbackToSms({
				e164,
				body,
				phoneFingerprint: request.phoneFingerprint,
			});
			return;
		}

		if (this.smsFrom) {
			await this.sendSms({
				e164,
				body,
				phoneFingerprint: request.phoneFingerprint,
				reason: "sms-only-mode",
			});
		}
	}

	private async sendWhatsAppOrFallbackToSms(input: { e164: string; body: string; phoneFingerprint: string }): Promise<"delivered"> {
		let syncError: TwilioDeliveryError | null = null;

		try {
			const sendResult = await sendViaTwilio({
				accountSid: this.accountSid,
				authToken: this.authToken,
				from: this.whatsAppFrom!,
				to: `whatsapp:${input.e164}`,
				body: input.body,
				channel: "whatsapp",
			});

			const deliveryOutcome = await waitForWhatsAppDeliveryOutcome({
				accountSid: this.accountSid,
				authToken: this.authToken,
				messageSid: sendResult.messageSid,
			});

			if (deliveryOutcome === "delivered" || deliveryOutcome === "pending") {
				logger.info(
					{ phoneFingerprint: input.phoneFingerprint, channel: "whatsapp" },
					deliveryOutcome === "pending" ? "OTP accepted on WhatsApp (delivery still pending)" : "OTP delivered on WhatsApp",
				);
				return "delivered";
			}

			if (deliveryOutcome === "recipient-unavailable" && this.smsFrom) {
				logger.info({ phoneFingerprint: input.phoneFingerprint }, "Recipient not on WhatsApp — sending OTP via SMS");
				await this.sendSms({
					e164: input.e164,
					body: input.body,
					phoneFingerprint: input.phoneFingerprint,
					reason: "whatsapp-unavailable",
				});
				return "delivered";
			}

			throw new Error(`WhatsApp OTP delivery failed (${deliveryOutcome}).`);
		} catch (error) {
			if (error instanceof TwilioDeliveryError) {
				syncError = error;
			} else if (isWhatsAppRecipientUnavailableError(error)) {
				syncError = error as TwilioDeliveryError;
			} else {
				throw error;
			}
		}

		if (syncError && isWhatsAppRecipientUnavailableCode(syncError.twilioErrorCode) && this.smsFrom) {
			logger.info({ phoneFingerprint: input.phoneFingerprint, twilioErrorCode: syncError.twilioErrorCode }, "Recipient not on WhatsApp — sending OTP via SMS");
			await this.sendSms({
				e164: input.e164,
				body: input.body,
				phoneFingerprint: input.phoneFingerprint,
				reason: "whatsapp-unavailable",
			});
			return "delivered";
		}

		throw syncError ?? new Error("WhatsApp OTP delivery failed.");
	}

	private async sendSms(input: { e164: string; body: string; phoneFingerprint: string; reason: "whatsapp-unavailable" | "sms-only-mode" }): Promise<void> {
		await sendViaTwilio({
			accountSid: this.accountSid,
			authToken: this.authToken,
			from: this.smsFrom!,
			to: input.e164,
			body: input.body,
			channel: "sms",
		});
		logger.info(
			{
				phoneFingerprint: input.phoneFingerprint,
				channel: "sms",
				reason: input.reason,
			},
			"OTP delivered via SMS",
		);
	}
}

export function createTwilioOtpProviderFromEnv(): OtpProvider | null {
	if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
		return null;
	}
	try {
		return new TwilioOtpProvider(process.env);
	} catch (error) {
		logger.error({ error }, "Twilio OTP provider could not be initialised");
		return null;
	}
}
