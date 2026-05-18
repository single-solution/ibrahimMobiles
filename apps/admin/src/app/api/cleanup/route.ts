/**
 * Admin "Data cleanup" endpoint — bulk-deletes a single collection at a
 * time. Used by the Settings → Cleanup tab to clear out test orders,
 * legacy inquiries, dead conversations, etc., without forcing the operator
 * to delete records one at a time.
 *
 * Hard rules:
 *   - Requires the `data_cleanup` permission (owner-only by default).
 *   - Requires a typed confirmation phrase that exactly matches the target.
 *     This makes accidental requests from a misclick impossible — the body
 *     literally has to contain the words the UI shows the operator.
 *   - Products are deliberately NOT a valid target. The product catalog is
 *     the only collection the user explicitly asked us to preserve.
 *   - Customer cleanup cascades to their orders + loyalty accounts to keep
 *     referential integrity, otherwise we'd leak `customerId` foreign keys.
 *
 * Returns `{ deletedCount }` so the UI can render a confirmation toast.
 */
import { NextResponse } from "next/server";

import {
  badRequest,
  forbidden,
  ok,
  parseBody,
} from "@store/shared";
import {
  connectDB,
  Conversation,
  Customer,
  handleMongoError,
  Inquiry,
  LoyaltyAccount,
  Order,
} from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { requireSession } from "@/lib/api/requireSession";
import { recordActivity } from "@/lib/services/activityLog";

const CLEANUP_TARGETS = [
  "orders",
  "inquiries",
  "customers",
  "conversations",
] as const;
type CleanupTarget = (typeof CLEANUP_TARGETS)[number];

/**
 * The exact phrase the operator must type for each target. Mirroring the
 * resource name in caps reads naturally in a confirm dialog and prevents
 * "type 'yes' to confirm" muscle memory from causing real damage.
 */
const CONFIRMATION_PHRASES: Record<CleanupTarget, string> = {
  orders: "DELETE ALL ORDERS",
  inquiries: "DELETE ALL INQUIRIES",
  customers: "DELETE ALL CUSTOMERS",
  conversations: "DELETE ALL CONVERSATIONS",
};

interface CleanupBody {
  target?: unknown;
  confirmation?: unknown;
}

function isCleanupTarget(value: unknown): value is CleanupTarget {
  return typeof value === "string" && (CLEANUP_TARGETS as readonly string[]).includes(value);
}

export async function POST(request: Request): Promise<NextResponse> {
  const { actor, response } = await requireSession("data_cleanup");
  if (response) {
    return response;
  }

  const body = await parseBody<CleanupBody>(request);
  if (body instanceof Response) {
    return body as NextResponse;
  }

  if (!isCleanupTarget(body.target)) {
    return badRequest(
      `Target must be one of: ${CLEANUP_TARGETS.join(", ")}.`,
    );
  }
  const target = body.target;
  const expected = CONFIRMATION_PHRASES[target];
  if (typeof body.confirmation !== "string" || body.confirmation.trim() !== expected) {
    // Use `forbidden` rather than `badRequest` to make it crystal clear in
    // logs that a confirmation challenge was failed.
    return forbidden(
      `Confirmation phrase must be exactly "${expected}".`,
    );
  }

  await connectDB();
  try {
    const deletedCount = await runCleanup(target);

    await recordActivity({
      actor,
      action: "deleted",
      resourceType: targetActivityResource(target),
      resourceLabel: `Bulk cleanup · ${target}`,
      detail: `Deleted ${deletedCount} record${deletedCount === 1 ? "" : "s"}`,
    });
    bustAdminCaches();

    return ok({ target, deletedCount });
  } catch (error) {
    return handleMongoError(error) as NextResponse;
  }
}

async function runCleanup(target: CleanupTarget): Promise<number> {
  switch (target) {
    case "orders": {
      const result = await Order.deleteMany({});
      return result.deletedCount ?? 0;
    }
    case "inquiries": {
      const result = await Inquiry.deleteMany({});
      return result.deletedCount ?? 0;
    }
    case "conversations": {
      const result = await Conversation.deleteMany({});
      return result.deletedCount ?? 0;
    }
    case "customers": {
      // Cascade — orphan orders + loyalty would leave dangling `customerId`
      // foreign keys and broken lifetime stats. Delete dependents first so
      // an interrupted cleanup never leaves an inconsistent customer doc.
      await Order.deleteMany({});
      await LoyaltyAccount.deleteMany({});
      const result = await Customer.deleteMany({});
      return result.deletedCount ?? 0;
    }
  }
}

/** Map a cleanup target to the closest `ActivityResourceType` value. */
function targetActivityResource(
  target: CleanupTarget,
): "order" | "inquiry" | "customer" | "conversation" {
  switch (target) {
    case "orders":
      return "order";
    case "inquiries":
      return "inquiry";
    case "customers":
      return "customer";
    case "conversations":
      return "conversation";
  }
}
