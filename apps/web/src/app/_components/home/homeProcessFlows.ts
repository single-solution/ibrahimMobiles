import { PackageOpen, ShieldCheck, ShoppingBag } from "lucide-react";
import type { ComponentType } from "react";
import type { StoreSettings } from "@store/shared";

type ProcessFlowKey = "store" | "order" | "return";

interface ProcessFlowStep {
	title: string;
	detail: string;
}

interface ProcessFlow {
	key: ProcessFlowKey;
	label: string;
	caption: string;
	icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
	steps: ProcessFlowStep[];
}

/**
 * Three flows behind every order — what we do (store), what you do (order),
 * what we promise (return). Powers the unified `*ProcessSection` blocks.
 *
 * Built per-request from the resolved `StoreSettings` so admin changes to
 * the moneyback window / discount % surface here without a redeploy.
 */
export function buildProcessFlows(settings: StoreSettings): ProcessFlow[] {
	return [
		{
			key: "store",
			label: "Store",
			caption: "How we curate",
			icon: PackageOpen,
			steps: [
				{ title: "Source", detail: "Stock comes only from verified suppliers we already trust." },
				{ title: "Inspect", detail: "Multi-point quality check on every unit before it goes on the shelf." },
				{ title: "Grade & verify", detail: "Honest condition notes and an admin-defined grade for every item." },
				{ title: "Tag", detail: "Every grade and attribute flagged up front so buyers know exactly what they're getting." },
			],
		},
		{
			key: "order",
			label: "Order",
			caption: "How you buy",
			icon: ShoppingBag,
			steps: [
				{ title: "Pick", detail: "Browse by category, brand, grade or budget." },
				{ title: "Confirm & pay", detail: "Add to cart, checkout with bank transfer, cash on delivery, or card — nationwide courier or store pickup." },
				{ title: "Proof on request", detail: "Ask for photos or a short video of your exact unit before dispatch." },
				{ title: "Dispatch", detail: "Same-day in-city where possible, 1–3 days nationwide on tracked courier." },
			],
		},
		{
			key: "return",
			label: "Return",
			caption: "What we promise",
			icon: ShieldCheck,
			steps: [
				{
					title: `${settings.moneybackDays}-day moneyback`,
					detail: `Change your mind, full refund within ${settings.moneybackDays} days.`,
				},
				{ title: "Warranty by grade", detail: "Each grade carries its own warranty term, shown on the product page." },
				{ title: "Service after warranty", detail: "We service genuine faults on stock we've sold even after the term ends." },
				{ title: "Not covered", detail: "Physical damage, liquid ingress, unauthorised repairs or tampering." },
			],
		},
	];
}
export type { ProcessFlow, ProcessFlowKey, ProcessFlowStep };
