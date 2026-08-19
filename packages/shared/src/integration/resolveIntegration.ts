import type { IntegrationSettingsValues } from "./integrationSettingsSchema";

function pickString(dbValue: string, envValue: string | undefined): string {
	const fromDb = dbValue.trim();
	if (fromDb) {
		return fromDb;
	}
	return envValue?.trim() ?? "";
}

/** Resolved credentials — DB settings win; env vars are bootstrap fallback. */
export function resolveIntegrationSettings(db: IntegrationSettingsValues): IntegrationSettingsValues {
	return {
		otpProvider: db.otpProvider || "auto",
		connectivityApiKey: pickString(db.connectivityApiKey, process.env.CONNECTIVITY_API_KEY),
		connectivitySenderId: pickString(db.connectivitySenderId, process.env.CONNECTIVITY_SENDER_ID) || "IbrahimMob",
		connectivityApiUrl: pickString(db.connectivityApiUrl, process.env.CONNECTIVITY_API_URL) || "https://connectivity.pk/api/send-whatsapp",
		connectivityOtpMessage: db.connectivityOtpMessage || "Your Ibrahim Mobiles verification code is {{code}}. Valid for 5 minutes.",

		smtpHost: pickString(db.smtpHost, process.env.SMTP_HOST),
		smtpPort: pickString(db.smtpPort, process.env.SMTP_PORT) || "587",
		smtpUser: pickString(db.smtpUser, process.env.SMTP_USER),
		smtpPass: pickString(db.smtpPass, process.env.SMTP_PASS),
		smtpFrom: pickString(db.smtpFrom, process.env.SMTP_FROM),
		staffNotifyEmail: pickString(db.staffNotifyEmail, process.env.STAFF_NOTIFY_EMAIL),
		staffNotifyWhatsApp: pickString(db.staffNotifyWhatsApp, process.env.STAFF_NOTIFY_WHATSAPP),
		adminSiteUrl: pickString(db.adminSiteUrl, process.env.ADMIN_SITE_URL),

		onlinePaymentProvider: "none",
		payfastMerchantId: "",
		payfastSecuredKey: "",
		payfastMerchantName: "",
		payfastSandbox: true,
		rapidGatewaySecretKey: "",
		rapidGatewayWebhookSecret: "",
		rapidGatewaySandbox: true,

		awsS3Bucket: pickString(db.awsS3Bucket, process.env.AWS_S3_BUCKET),
		awsS3Region: pickString(db.awsS3Region, process.env.AWS_S3_REGION),
		awsAccessKeyId: pickString(db.awsAccessKeyId, process.env.AWS_ACCESS_KEY_ID),
		awsSecretAccessKey: pickString(db.awsSecretAccessKey, process.env.AWS_SECRET_ACCESS_KEY),
		awsS3PublicUrlBase: pickString(db.awsS3PublicUrlBase, process.env.AWS_S3_PUBLIC_URL_BASE),
		awsS3Endpoint: pickString(db.awsS3Endpoint, process.env.AWS_S3_ENDPOINT),
	};
}

/** Online card checkout is not offered on this deployment. */
export function isOnlineCardCheckoutReady(_settings: IntegrationSettingsValues): boolean {
	return false;
}
