import { logger } from "../logger";
import type { IntegrationSettingsValues } from "../integration/integrationSettingsSchema";

export interface SendResendEmailInput {
	to: string;
	subject: string;
	text: string;
	from?: string;
	settings?: Pick<IntegrationSettingsValues, "resendApiKey" | "resendFromEmail">;
}

function readSmtpConfig(): {
	host: string;
	port: number;
	user: string;
	pass: string;
	from: string;
} | null {
	const host = process.env.SMTP_HOST?.trim();
	const user = process.env.SMTP_USER?.trim();
	const pass = process.env.SMTP_PASS?.trim();
	if (!host || !user || !pass) {
		return null;
	}
	const port = Number(process.env.SMTP_PORT?.trim() || "587");
	const from = process.env.SMTP_FROM?.trim() || user;
	return { host, port: Number.isFinite(port) ? port : 587, user, pass, from };
}

/** Temporary Gmail/SMTP path when Resend is not configured. */
async function sendViaSmtp(input: {
	to: string;
	subject: string;
	text: string;
	from?: string;
}): Promise<boolean> {
	const smtp = readSmtpConfig();
	if (!smtp) {
		return false;
	}

	try {
		const nodemailer = await import("nodemailer");
		const transporter = nodemailer.createTransport({
			host: smtp.host,
			port: smtp.port,
			secure: smtp.port === 465,
			auth: { user: smtp.user, pass: smtp.pass },
		});

		await transporter.sendMail({
			from: input.from?.trim() || smtp.from,
			to: input.to,
			subject: input.subject,
			text: input.text,
		});
		return true;
	} catch (error) {
		logger.warn({ error }, "SMTP email request failed");
		return false;
	}
}

/** Send a plain-text email via Resend, falling back to SMTP when Resend is unset. */
export async function sendResendEmail(input: SendResendEmailInput): Promise<boolean> {
	let apiKey = input.settings?.resendApiKey?.trim() || process.env.RESEND_API_KEY?.trim();
	let fromDefault = input.settings?.resendFromEmail?.trim() || process.env.RESEND_FROM_EMAIL?.trim();

	if (!apiKey || !fromDefault) {
		try {
			const { getIntegrationSettings } = await import("@store/db");
			const integration = await getIntegrationSettings();
			apiKey = apiKey || integration.resendApiKey.trim();
			fromDefault = fromDefault || integration.resendFromEmail.trim();
		} catch (error) {
			logger.warn({ error }, "Resend: could not load integration settings");
		}
	}

	const to = input.to.trim();
	if (!to) {
		return false;
	}

	if (!apiKey) {
		return sendViaSmtp({
			to,
			subject: input.subject,
			text: input.text,
			from: input.from,
		});
	}

	const from = input.from?.trim() || fromDefault || "onboarding@resend.dev";

	try {
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from,
				to: [to],
				subject: input.subject,
				text: input.text,
			}),
		});

		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			logger.warn({ status: response.status, detail: detail.slice(0, 200) }, "Resend email failed");
			return sendViaSmtp({
				to,
				subject: input.subject,
				text: input.text,
				from: input.from,
			});
		}

		return true;
	} catch (error) {
		logger.warn({ error }, "Resend email request failed");
		return sendViaSmtp({
			to,
			subject: input.subject,
			text: input.text,
			from: input.from,
		});
	}
}

/** True when Resend or SMTP bootstrap env can send mail. */
export function isOutboundEmailConfigured(settings?: Pick<IntegrationSettingsValues, "resendApiKey" | "resendFromEmail">): boolean {
	const hasResend = Boolean(
		(settings?.resendApiKey?.trim() || process.env.RESEND_API_KEY?.trim()) &&
			(settings?.resendFromEmail?.trim() || process.env.RESEND_FROM_EMAIL?.trim()),
	);
	return hasResend || readSmtpConfig() !== null;
}
