"use client";

import { Banknote, Sparkles, Wallet } from "lucide-react";
import { STORE_SETTING_GROUPS } from "@store/shared";
import { FormSection } from "@/components/forms/FormSection";
import { Switch } from "@/components/forms/Switch";
import { TextField } from "@/components/forms/TextField";
import { FormGrid, SettingsTabHero, type SettingsHeroMetric } from "@/app/settings/_components/settingsWorkspaceUi";
import { NumberField, SaveableSection } from "@/app/settings/_components/settingsSaveableSection";
import type { SectionProps } from "@/app/settings/_components/settingsSectionProps";

export function PaymentSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
	const enabledCount = [draft.paymentBankEnabled, draft.paymentEasypaisaEnabled, draft.paymentJazzcashEnabled, draft.paymentCodEnabled].filter(Boolean).length;
	const bankReady = Boolean(draft.paymentBankEnabled && draft.paymentBankName.trim() && (draft.paymentBankAccountNumber.trim() || draft.paymentBankIban.trim()));
	const easypaisaReady = Boolean(draft.paymentEasypaisaEnabled && draft.paymentEasypaisaNumber.trim());
	const jazzcashReady = Boolean(draft.paymentJazzcashEnabled && draft.paymentJazzcashNumber.trim());
	const heroMetrics: SettingsHeroMetric[] = [
		{
			label: "Methods at checkout",
			value: `${enabledCount} of 4`,
			hint: enabledCount === 0 ? "Checkout has no methods!" : "Live on storefront",
			tone: enabledCount === 0 ? "warn" : enabledCount >= 2 ? "good" : "neutral",
			icon: Wallet,
		},
		{
			label: "Bank transfer",
			value: !draft.paymentBankEnabled ? "Off" : bankReady ? "Ready" : "Missing details",
			tone: !draft.paymentBankEnabled ? "off" : bankReady ? "good" : "warn",
			icon: Banknote,
		},
		{
			label: "Easypaisa",
			value: !draft.paymentEasypaisaEnabled ? "Off" : easypaisaReady ? "Ready" : "Missing wallet",
			tone: !draft.paymentEasypaisaEnabled ? "off" : easypaisaReady ? "good" : "warn",
			icon: Wallet,
		},
		{
			label: "JazzCash",
			value: !draft.paymentJazzcashEnabled ? "Off" : jazzcashReady ? "Ready" : "Missing wallet",
			tone: !draft.paymentJazzcashEnabled ? "off" : jazzcashReady ? "good" : "warn",
			icon: Wallet,
		},
		{
			label: "Bank discount",
			value: `${draft.bankTransferDiscountPercent || 0}%`,
			hint: draft.bankTransferDiscountPercent > 0 ? "Auto-applied at checkout" : "No discount",
			tone: draft.bankTransferDiscountPercent > 0 ? "good" : "neutral",
			icon: Sparkles,
		},
	];
	return (
		<SaveableSection
			fields={STORE_SETTING_GROUPS.payments}
			draft={draft}
			saved={saved}
			setField={setField}
			onSaved={onSaved}
			canUpdate={canUpdate}
			hero={<SettingsTabHero metrics={heroMetrics} />}
		>
			<FormSection
				title="Methods enabled at checkout"
				description="Toggle off any method you can't honour right now — the chip disappears from checkout immediately. Customers always see at least one method."
			>
				<FormGrid>
					<Switch
						label="Bank transfer"
						description="Customers pay in advance to your bank account."
						checked={draft.paymentBankEnabled}
						onCheckedChange={(value) => setField("paymentBankEnabled", value)}
						disabled={!canUpdate}
					/>
					<Switch
						label="Easypaisa"
						description="Mobile wallet pre-payment."
						checked={draft.paymentEasypaisaEnabled}
						onCheckedChange={(value) => setField("paymentEasypaisaEnabled", value)}
						disabled={!canUpdate}
					/>
					<Switch
						label="JazzCash"
						description="Mobile wallet pre-payment."
						checked={draft.paymentJazzcashEnabled}
						onCheckedChange={(value) => setField("paymentJazzcashEnabled", value)}
						disabled={!canUpdate}
					/>
					<Switch
						label="Cash on delivery / pickup"
						description="Pay on hand-over at local delivery or shop pickup."
						checked={draft.paymentCodEnabled}
						onCheckedChange={(value) => setField("paymentCodEnabled", value)}
						disabled={!canUpdate}
					/>
				</FormGrid>
			</FormSection>

			<FormSection title="Bank transfer details" description="Shown to customers on the order success page after they pick bank transfer. Each row gets a Copy button.">
				<FormGrid>
					<TextField
						label="Bank name"
						value={draft.paymentBankName}
						onChange={(event) => setField("paymentBankName", event.target.value)}
						placeholder="e.g. Meezan Bank"
						disabled={!canUpdate}
					/>
					<TextField
						label="Account title"
						value={draft.paymentBankAccountTitle}
						onChange={(event) => setField("paymentBankAccountTitle", event.target.value)}
						placeholder="As registered on the bank account"
						disabled={!canUpdate}
					/>
					<TextField
						label="Account number"
						value={draft.paymentBankAccountNumber}
						onChange={(event) => setField("paymentBankAccountNumber", event.target.value)}
						placeholder="e.g. 0123456789012"
						inputMode="numeric"
						disabled={!canUpdate}
					/>
					<TextField
						label="IBAN"
						value={draft.paymentBankIban}
						onChange={(event) => setField("paymentBankIban", event.target.value)}
						placeholder="e.g. PK24MEZN0001230012345678"
						hint="Leave blank if you don't have an IBAN — the row hides automatically."
						disabled={!canUpdate}
					/>
				</FormGrid>
			</FormSection>

			<FormSection title="Mobile wallet details" description="Account particulars customers see on the order success page after picking a wallet.">
				<div className="grid gap-3 md:gap-5 md:grid-cols-2">
					<div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-3 md:p-4">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">Easypaisa</p>
						<TextField
							label="Account title"
							value={draft.paymentEasypaisaAccountTitle}
							onChange={(event) => setField("paymentEasypaisaAccountTitle", event.target.value)}
							placeholder="As registered on the wallet"
							disabled={!canUpdate}
						/>
						<TextField
							label="Wallet number"
							value={draft.paymentEasypaisaNumber}
							onChange={(event) => setField("paymentEasypaisaNumber", event.target.value)}
							placeholder="e.g. 0300-1234567"
							inputMode="tel"
							disabled={!canUpdate}
						/>
					</div>
					<div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-3 md:p-4">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">JazzCash</p>
						<TextField
							label="Account title"
							value={draft.paymentJazzcashAccountTitle}
							onChange={(event) => setField("paymentJazzcashAccountTitle", event.target.value)}
							placeholder="As registered on the wallet"
							disabled={!canUpdate}
						/>
						<TextField
							label="Wallet number"
							value={draft.paymentJazzcashNumber}
							onChange={(event) => setField("paymentJazzcashNumber", event.target.value)}
							placeholder="e.g. 0301-1234567"
							inputMode="tel"
							disabled={!canUpdate}
						/>
					</div>
				</div>
			</FormSection>

			<FormSection title="Checkout copy & discounts" description="Short notes the customer sees alongside each method.">
				<FormGrid>
					<TextField
						label="COD note"
						value={draft.paymentCodNote}
						onChange={(event) => setField("paymentCodNote", event.target.value)}
						placeholder="Local only · in-person verify"
						hint="Shown under the Cash on Delivery chip and on the order page."
						disabled={!canUpdate}
					/>
					<NumberField
						label="Bank transfer discount %"
						value={draft.bankTransferDiscountPercent}
						onChange={(value) => setField("bankTransferDiscountPercent", value)}
						trailingAddon="%"
						placeholder="e.g. 2"
						hint="Auto-applied when the customer picks bank transfer at checkout."
						disabled={!canUpdate}
						containerClassName="w-full"
					/>
				</FormGrid>
			</FormSection>
		</SaveableSection>
	);
}
