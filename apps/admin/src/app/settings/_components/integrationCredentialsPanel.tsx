"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import {
	type IntegrationSettingsValues,
	type OtpIntegrationStatus,
	type OnlinePaymentIntegrationStatus,
	type StorageIntegrationStatus,
} from "@store/shared";
import { apiFetch } from "@/lib/api";
import { FormSection } from "@/components/forms/FormSection";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@store/ui";
import { FormGrid } from "@/app/settings/_components/settingsWorkspaceUi";

interface IntegrationCredentialsPanelProps {
	canUpdate: boolean;
}

/** Host-env integrations (SMTP, R2). Ops fields for staff email alerts only. */
export function IntegrationCredentialsPanel({ canUpdate }: IntegrationCredentialsPanelProps) {
	const [draft, setDraft] = useState<IntegrationSettingsValues | null>(null);
	const [status, setStatus] = useState<{
		otp: OtpIntegrationStatus;
		storage: StorageIntegrationStatus;
		onlinePayment: OnlinePaymentIntegrationStatus;
	} | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const load = useCallback(async () => {
		const data = await apiFetch<{
			settings: IntegrationSettingsValues;
			status: { otp: OtpIntegrationStatus; storage: StorageIntegrationStatus; onlinePayment: OnlinePaymentIntegrationStatus };
		}>("/api/settings/integrations");
		setDraft(data.settings);
		setStatus(data.status);
	}, []);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- initial integration settings fetch
		void load().catch(() => undefined);
	}, [load]);

	function setField<K extends keyof IntegrationSettingsValues>(field: K, value: IntegrationSettingsValues[K]) {
		setDraft((current) => (current ? { ...current, [field]: value } : current));
	}

	async function handleSave() {
		if (!draft || !canUpdate) {
			return;
		}
		setIsSaving(true);
		setMessage(null);
		try {
			const data = await apiFetch<{
				settings: IntegrationSettingsValues;
				status: { otp: OtpIntegrationStatus; storage: StorageIntegrationStatus; onlinePayment: OnlinePaymentIntegrationStatus };
			}>("/api/settings/integrations", {
				method: "PUT",
				body: JSON.stringify({
					staffNotifyEmail: draft.staffNotifyEmail,
					adminSiteUrl: draft.adminSiteUrl,
					// Locked off — this storefront does not use Meta WhatsApp or online gateways.
					otpProvider: "console",
					onlinePaymentProvider: "none",
				}),
			});
			setDraft(data.settings);
			setStatus(data.status);
			setMessage("Integration settings saved.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Could not save integration settings.");
		} finally {
			setIsSaving(false);
		}
	}

	if (!draft) {
		return <p className="text-[13px] text-[var(--color-ink-500)]">Loading integration settings…</p>;
	}

	return (
		<div className="space-y-8">
			{message ? <p className="text-[13px] text-[var(--color-ink-700)]">{message}</p> : null}

			<FormSection
				title="Email & staff alerts"
				description="SMTP credentials live in deploy env (SMTP_*). Staff get order and chat alerts by email."
			>
				<p className="mb-3 text-[12.5px] leading-relaxed text-[var(--color-ink-600)]">
					Host env: <code className="text-[11.5px]">SMTP_HOST</code>, <code className="text-[11.5px]">SMTP_USER</code>,{" "}
					<code className="text-[11.5px]">SMTP_PASS</code>, <code className="text-[11.5px]">SMTP_FROM</code>. Customer
					sign-in OTP prints to server logs (console). Online card gateways are not enabled for this shop.
				</p>
				<FormGrid cols={2}>
					<TextField
						label="Staff notify email"
						value={draft.staffNotifyEmail}
						onChange={(event) => setField("staffNotifyEmail", event.target.value)}
						hint="Falls back to store support email when empty."
						leadingIcon={<Mail size={14} />}
						disabled={!canUpdate}
					/>
					<TextField
						label="Admin site URL"
						type="url"
						value={draft.adminSiteUrl}
						onChange={(event) => setField("adminSiteUrl", event.target.value)}
						placeholder="https://admin.yourdomain.com"
						hint="Password reset and inquiry deep links. Or set ADMIN_SITE_URL on the host."
						disabled={!canUpdate}
					/>
				</FormGrid>
			</FormSection>

			<FormSection
				title="Media storage (Cloudflare R2 / S3)"
				description={
					status?.storage.summary ??
					"Bucket credentials live in deploy env (AWS_S3_*). Set them on Vercel — not in this form."
				}
			>
				<p className="text-[12.5px] leading-relaxed text-[var(--color-ink-600)]">
					Required on the host: <code className="text-[11.5px]">AWS_S3_BUCKET</code>,{" "}
					<code className="text-[11.5px]">AWS_S3_REGION</code>, <code className="text-[11.5px]">AWS_ACCESS_KEY_ID</code>,{" "}
					<code className="text-[11.5px]">AWS_SECRET_ACCESS_KEY</code>, <code className="text-[11.5px]">AWS_S3_ENDPOINT</code>,{" "}
					<code className="text-[11.5px]">AWS_S3_PUBLIC_URL_BASE</code>. Status:{" "}
					<strong className="font-semibold text-[var(--color-ink-800)]">
						{status?.storage.ready ? "ready" : "not ready"}
					</strong>
					.
				</p>
			</FormSection>

			{canUpdate ? (
				<div className="flex justify-end">
					<Button variant="primary" size="md" onClick={() => void handleSave()} isLoading={isSaving}>
						Save integration settings
					</Button>
				</div>
			) : null}
		</div>
	);
}
