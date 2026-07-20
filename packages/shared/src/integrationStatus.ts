import type { IntegrationSettingsValues, OnlinePaymentProvider } from "./integration/integrationSettingsSchema";
import { isOnlineCardCheckoutReady } from "./integration/resolveIntegration";

export type OtpRuntimeProviderId = "whatsapp-cloud" | "console";

export interface OtpIntegrationStatus {
	explicitProvider: string;
	activeProvider: OtpRuntimeProviderId;
	metaWhatsApp: {
		accessTokenConfigured: boolean;
		phoneNumberIdConfigured: boolean;
		otpTemplateName: string;
	};
	readyForProduction: boolean;
	summary: string;
}

export interface StorageIntegrationStatus {
	s3Configured: boolean;
	ready: boolean;
	summary: string;
}

export interface OnlinePaymentIntegrationStatus {
	provider: OnlinePaymentProvider;
	ready: boolean;
	payfastConfigured: boolean;
	rapidConfigured: boolean;
	webhookConfigured: boolean;
	summary: string;
}

export function readOtpIntegrationStatus(settings: IntegrationSettingsValues): OtpIntegrationStatus {
	const explicit =
		settings.otpProvider === "auto"
			? (process.env.OTP_PROVIDER ?? "").trim().toLowerCase()
			: settings.otpProvider;
	const metaAccessConfigured = Boolean(settings.whatsappCloudAccessToken.trim());
	const metaPhoneIdConfigured = Boolean(settings.whatsappPhoneNumberId.trim());
	const metaReady = metaAccessConfigured && metaPhoneIdConfigured;
	const otpTemplateName = settings.whatsappOtpTemplateName.trim() || "authentication";

	let activeProvider: OtpRuntimeProviderId = "console";

	if (explicit === "whatsapp-cloud" || explicit === "meta") {
		activeProvider = metaReady ? "whatsapp-cloud" : "console";
	} else if (explicit === "console") {
		activeProvider = "console";
	} else if (metaReady) {
		activeProvider = "whatsapp-cloud";
	}

	const readyForProduction = activeProvider === "whatsapp-cloud";

	let summary = "Console provider — codes print to server logs (development only).";
	if (explicit === "whatsapp-cloud" && !metaReady) {
		summary = "WhatsApp Cloud selected but access token or phone number ID is missing.";
	} else if (activeProvider === "whatsapp-cloud") {
		summary = `Meta WhatsApp Cloud API active — OTP template "${otpTemplateName}".`;
	}

	return {
		explicitProvider: explicit || "(auto)",
		activeProvider,
		metaWhatsApp: {
			accessTokenConfigured: metaAccessConfigured,
			phoneNumberIdConfigured: metaPhoneIdConfigured,
			otpTemplateName,
		},
		readyForProduction,
		summary,
	};
}

export function readStorageIntegrationStatus(settings: IntegrationSettingsValues): StorageIntegrationStatus {
	const s3Configured = Boolean(
		settings.awsS3Bucket.trim() &&
			settings.awsS3Region.trim() &&
			settings.awsAccessKeyId.trim() &&
			settings.awsSecretAccessKey.trim(),
	);
	const publicBaseConfigured = Boolean(settings.awsS3PublicUrlBase.trim());
	const usesCustomEndpoint = Boolean(settings.awsS3Endpoint.trim());
	const ready = s3Configured && (!usesCustomEndpoint || publicBaseConfigured);

	let summary = "Bucket, region, or credentials incomplete — uploads will fail.";
	if (s3Configured && usesCustomEndpoint && !publicBaseConfigured) {
		summary = "R2/S3 endpoint is set but AWS_S3_PUBLIC_URL_BASE is missing — uploads will use a broken URL.";
	} else if (ready) {
		summary = publicBaseConfigured
			? "Bucket configured via deploy env — uploads use your public CDN / R2.dev URL."
			: "Bucket configured — product and brand uploads use your S3 bucket.";
	}

	return {
		s3Configured,
		ready,
		summary,
	};
}

export function readOnlinePaymentIntegrationStatus(settings: IntegrationSettingsValues): OnlinePaymentIntegrationStatus {
	const provider = settings.onlinePaymentProvider;
	const payfastConfigured = Boolean(settings.payfastMerchantId.trim() && settings.payfastSecuredKey.trim());
	const rapidConfigured = Boolean(settings.rapidGatewaySecretKey.trim());
	const webhookConfigured =
		provider === "rapid-gateway"
			? Boolean(settings.rapidGatewayWebhookSecret.trim())
			: provider === "payfast"
				? payfastConfigured
				: false;
	const ready = isOnlineCardCheckoutReady(settings);

	let summary = "No online gateway — bank transfer and COD are active. Pick PayFast or Rapid Gateway below.";
	if (provider === "payfast" && !payfastConfigured) {
		summary = "PayFast selected but merchant ID or secured key is missing.";
	} else if (provider === "payfast" && ready) {
		summary = `PayFast ready${settings.payfastSandbox ? " (sandbox)" : " (live)"} — cards and wallets on hosted checkout.`;
	} else if (provider === "rapid-gateway" && !rapidConfigured) {
		summary = "Rapid Gateway selected but secret key is missing.";
	} else if (provider === "rapid-gateway" && ready && !settings.rapidGatewayWebhookSecret.trim()) {
		summary = "Rapid Gateway checkout works — add webhook secret so paid orders auto-confirm.";
	} else if (provider === "rapid-gateway" && ready) {
		summary = `Rapid Gateway ready${settings.rapidGatewaySandbox ? " (sandbox)" : " (live)"} — cards, JazzCash, easypaisa.`;
	}

	return {
		provider,
		ready,
		payfastConfigured,
		rapidConfigured,
		webhookConfigured,
		summary,
	};
}
