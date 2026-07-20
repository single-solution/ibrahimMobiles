"use client";

import { Banknote, Building2, Percent } from "lucide-react";
import { STORE_SETTING_GROUPS } from "@store/shared";
import { FormSection } from "@/components/forms/FormSection";
import { Switch } from "@/components/forms/Switch";
import { TextField } from "@/components/forms/TextField";
import { FormGrid, SettingsTabHero, type SettingsHeroMetric } from "@/app/settings/_components/settingsWorkspaceUi";
import { NumberField, SaveableSection } from "@/app/settings/_components/settingsSaveableSection";
import type { SectionProps } from "@/app/settings/_components/settingsSectionProps";

export function PaymentSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
	const enabledCount = [draft.paymentBankTransferEnabled, draft.paymentCodEnabled].filter(Boolean).length;
	const heroMetrics: SettingsHeroMetric[] = [
		{
			label: "Methods at checkout",
			value: `${enabledCount} of 2`,
			hint: enabledCount === 0 ? "Checkout has no methods!" : "Live on storefront",
			tone: enabledCount === 0 ? "warn" : "good",
			icon: Building2,
		},
		{
			label: "Bank transfer",
			value: draft.paymentBankTransferEnabled ? "On" : "Off",
			tone: draft.paymentBankTransferEnabled ? "good" : "off",
			icon: Building2,
		},
		{
			label: "Cash on delivery",
			value: draft.paymentCodEnabled ? "On" : "Off",
			tone: draft.paymentCodEnabled ? "good" : "off",
			icon: Banknote,
		},
		{
			label: "COD surcharge",
			value: `${draft.codSurchargePercent || 0}%`,
			hint: draft.codSurchargePercent > 0 ? "Added to cash orders" : "No extra charge",
			tone: draft.codSurchargePercent > 0 ? "neutral" : "good",
			icon: Percent,
		},
	];

	return (
		<SaveableSection
			fields={STORE_SETTING_GROUPS.payments}
			draft={{ ...draft, paymentCardEnabled: false }}
			saved={{ ...saved, paymentCardEnabled: false }}
			setField={(field, value) => {
				if (field === "paymentCardEnabled") {
					setField("paymentCardEnabled", false);
					return;
				}
				setField(field, value);
			}}
			onSaved={(settings) => onSaved({ ...settings, paymentCardEnabled: false })}
			canUpdate={canUpdate}
			hero={<SettingsTabHero metrics={heroMetrics} />}
		>
			<FormSection
				title="Methods enabled at checkout"
				description="Bank transfer (manual confirmation) and cash on delivery / pickup. Online card gateways are not enabled for this shop."
			>
				<FormGrid>
					<Switch
						label="Bank transfer"
						description="Customer transfers online, then uploads a payment screenshot for staff to confirm."
						checked={draft.paymentBankTransferEnabled}
						onCheckedChange={(value) => setField("paymentBankTransferEnabled", value)}
						disabled={!canUpdate}
					/>
					<Switch
						label="Cash on delivery / pickup"
						description="Pay in cash when the order is handed over."
						checked={draft.paymentCodEnabled}
						onCheckedChange={(value) => setField("paymentCodEnabled", value)}
						disabled={!canUpdate}
					/>
				</FormGrid>
			</FormSection>

			<FormSection title="Bank account details" description="Shown at checkout and on pending bank-transfer orders.">
				<FormGrid>
					<TextField
						label="Bank name"
						value={draft.bankName}
						onChange={(event) => setField("bankName", event.target.value)}
						placeholder="e.g. Meezan Bank"
						disabled={!canUpdate}
					/>
					<TextField
						label="Account title"
						value={draft.bankAccountTitle}
						onChange={(event) => setField("bankAccountTitle", event.target.value)}
						placeholder="Account holder name"
						disabled={!canUpdate}
					/>
					<TextField
						label="Account number"
						value={draft.bankAccountNumber}
						onChange={(event) => setField("bankAccountNumber", event.target.value)}
						placeholder="0000000000000"
						disabled={!canUpdate}
					/>
					<TextField
						label="IBAN (optional)"
						value={draft.bankIban}
						onChange={(event) => setField("bankIban", event.target.value)}
						placeholder="PK00XXXX..."
						disabled={!canUpdate}
					/>
				</FormGrid>
			</FormSection>

			<FormSection title="Cash handling surcharge" description="Optional extra % on the merchandise subtotal when the customer picks cash on delivery.">
				<FormGrid>
					<NumberField
						label="COD surcharge %"
						value={draft.codSurchargePercent}
						onChange={(value) => setField("codSurchargePercent", value)}
						trailingAddon="%"
						placeholder="e.g. 2"
						hint="Shown on the COD chip and added to the order total at checkout."
						disabled={!canUpdate}
						containerClassName="w-full"
					/>
				</FormGrid>
			</FormSection>

			<FormSection title="Checkout copy" description="Short notes the customer sees alongside each payment method.">
				<FormGrid>
					<TextField
						label="Bank transfer note"
						value={draft.paymentBankTransferNote}
						onChange={(event) => setField("paymentBankTransferNote", event.target.value)}
						placeholder="Transfer online — upload your payment screenshot after paying"
						disabled={!canUpdate}
					/>
					<TextField
						label="COD note"
						value={draft.paymentCodNote}
						onChange={(event) => setField("paymentCodNote", event.target.value)}
						placeholder="Pay when you receive your order"
						hint="Shown under the cash on delivery chip and on the order page."
						disabled={!canUpdate}
					/>
				</FormGrid>
			</FormSection>
		</SaveableSection>
	);
}
