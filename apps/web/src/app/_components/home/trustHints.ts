import { Banknote, ShieldCheck, Truck, Undo2, type LucideIcon } from "lucide-react";

import { formatPrice, type StoreSettings } from "@store/shared";

export interface TrustHint {
	icon: LucideIcon;
	label: string;
}

/**
 * The storefront's promise chips, built entirely from admin-managed store
 * settings (policy + delivery groups). Any value the admin zeroes out drops
 * its chip, so the banner never shows a meaningless "0-day" / "Rs 0" claim.
 */
export function buildTrustHints(settings: StoreSettings): TrustHint[] {
	const hints: TrustHint[] = [];

	if (settings.moneybackDays > 0) {
		hints.push({ icon: Undo2, label: `${settings.moneybackDays}-day moneyback` });
	}
	if (settings.defaultWarrantyMonths > 0) {
		hints.push({ icon: ShieldCheck, label: `${settings.defaultWarrantyMonths}-month warranty` });
	}
	if (settings.bankTransferDiscountPercent > 0) {
		hints.push({
			icon: Banknote,
			label: `${settings.bankTransferDiscountPercent}% off bank transfer`,
		});
	}
	if (settings.freeDeliveryThresholdRupees > 0) {
		hints.push({
			icon: Truck,
			label: `Free delivery over ${formatPrice(settings.freeDeliveryThresholdRupees)}`,
		});
	}

	return hints;
}
