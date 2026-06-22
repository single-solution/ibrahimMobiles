/**
 * Admin "Rebuild indexes" endpoint.
 *
 * Production runs with `autoIndex: false` (building indexes on every boot is
 * slow and risky), so the compound indexes declared in the schemas only exist
 * if something creates them. This endpoint calls `createIndexes()` on every
 * model — it is **non-destructive** (creates anything missing, never drops),
 * idempotent, and safe to re-run after a schema index is added.
 *
 * Owner-only via the `data_cleanup` permission (the same gate as other
 * maintenance actions). Atlas Search indexes are separate and unaffected —
 * create those in the Atlas UI (see `docs/setup.md`).
 */
import { NextResponse } from "next/server";

import { ok } from "@store/shared";
import {
	ActivityEntry,
	Attribute,
	Brand,
	Category,
	connectDB,
	Customer,
	Grade,
	handleMongoError,
	Inquiry,
	LoyaltyAccount,
	Offer,
	Order,
	OtpCode,
	Product,
	Setting,
	User,
} from "@store/db";
import type { Model } from "mongoose";

import { requireSession } from "@/lib/api/requireSession";
import { recordActivity } from "@/lib/services/activityLog";

const MODELS: Array<{ name: string; model: Model<unknown> }> = [
	{ name: "Product", model: Product as unknown as Model<unknown> },
	{ name: "Brand", model: Brand as unknown as Model<unknown> },
	{ name: "Category", model: Category as unknown as Model<unknown> },
	{ name: "Grade", model: Grade as unknown as Model<unknown> },
	{ name: "Attribute", model: Attribute as unknown as Model<unknown> },
	{ name: "Offer", model: Offer as unknown as Model<unknown> },
	{ name: "Order", model: Order as unknown as Model<unknown> },
	{ name: "Customer", model: Customer as unknown as Model<unknown> },
	{ name: "Inquiry", model: Inquiry as unknown as Model<unknown> },
	{ name: "LoyaltyAccount", model: LoyaltyAccount as unknown as Model<unknown> },
	{ name: "User", model: User as unknown as Model<unknown> },
	{ name: "Setting", model: Setting as unknown as Model<unknown> },
	{ name: "OtpCode", model: OtpCode as unknown as Model<unknown> },
	{ name: "ActivityEntry", model: ActivityEntry as unknown as Model<unknown> },
];

interface ReindexResult {
	collection: string;
	status: "ok" | "error";
	detail?: string;
}

export async function POST(): Promise<NextResponse> {
	const { actor, response } = await requireSession("data_cleanup");
	if (response) {
		return response;
	}

	await connectDB();
	try {
		const results: ReindexResult[] = [];
		// Sequential on purpose: index builds are I/O heavy on Atlas, and running
		// them one collection at a time keeps the cluster responsive to live traffic.
		for (const entry of MODELS) {
			try {
				await entry.model.createIndexes();
				results.push({ collection: entry.name, status: "ok" });
			} catch (error) {
				results.push({
					collection: entry.name,
					status: "error",
					detail: error instanceof Error ? error.message : String(error),
				});
			}
		}

		const failed = results.filter((result) => result.status === "error").length;
		await recordActivity({
			actor,
			action: "updated",
			resourceType: "product",
			resourceLabel: "Database indexes rebuilt",
			detail: `${results.length - failed}/${results.length} collections indexed`,
		});

		return ok({ results });
	} catch (error) {
		return handleMongoError(error) as NextResponse;
	}
}
