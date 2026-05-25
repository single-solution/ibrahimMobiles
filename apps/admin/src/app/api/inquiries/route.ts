import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import { ok, isValidId } from "@store/shared";

import {
  connectDB,
  Customer,
  Inquiry,
  INQUIRY_STATUSES,
  type InquiryStatus,
} from "@store/db";

import {
  summariseInquiry,
  type InquiryLean,
} from "@/lib/serializers/inquiry";
import type { AdminInquirySummary } from "@/types/admin";

const ALLOWED_STATUSES = new Set<string>(INQUIRY_STATUSES);

/**
 * List inquiries. Threaded-chat write paths (sending messages, opening
 * a thread on behalf of a customer) land in Phase 8 once the chat
 * widget exists; this list is the only admin-side read surface today.
 */
export async function GET(request: Request) {
  const { actor, response } = await requireSession("inquiry_view");
  if (response) {
    return response;
  }

  await connectDB();
  const url = new URL(request.url);
  if (url.searchParams.get("summary") === "1") {
    const unreadByTeam = await Inquiry.countDocuments({
      status: { $ne: "resolved" },
      unreadByTeam: { $gt: 0 },
    });
    return ok({ unreadByTeam });
  }

  const { page, limit, skip, search, searchPattern } = readListOptions(request);
  const statusFilter = url.searchParams.get("status");
  const inboxFilter = url.searchParams.get("filter");
  const customerId = url.searchParams.get("customerId");

  const filter: Record<string, unknown> = {};
  const andConditions: Record<string, unknown>[] = [];

  if (customerId && isValidId(customerId)) {
    const customer = await Customer.findById(customerId)
      .select("phoneNumber")
      .lean<{ phoneNumber: string }>();
    if (customer) {
      andConditions.push({
        $or: [{ customerId }, { phoneNumber: customer.phoneNumber }],
      });
    } else {
      filter.customerId = customerId;
    }
  }
  if (search) {
    andConditions.push({
      $or: [
        { customerName: { $regex: searchPattern, $options: "i" } },
        { phoneNumber: { $regex: searchPattern, $options: "i" } },
        { subjectProductName: { $regex: searchPattern, $options: "i" } },
        { lastMessagePreview: { $regex: searchPattern, $options: "i" } },
      ],
    });
  }
  if (andConditions.length === 1) {
    Object.assign(filter, andConditions[0]);
  } else if (andConditions.length > 1) {
    filter.$and = andConditions;
  }
  if (statusFilter && ALLOWED_STATUSES.has(statusFilter)) {
    filter.status = statusFilter as InquiryStatus;
  }
  if (inboxFilter === "mine") {
    filter.assignedToUserId = actor.id;
    filter.status = { $ne: "resolved" };
  }
  if (inboxFilter === "unassigned") {
    filter.assignedToUserId = { $exists: false };
    filter.status = { $ne: "resolved" };
  }

  const [docs, total] = await Promise.all([
    Inquiry.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<InquiryLean[]>(),
    Inquiry.countDocuments(filter),
  ]);

  const payload: ListResponse<AdminInquirySummary> = {
    items: docs.map(summariseInquiry),
    total,
    page,
    limit,
  };
  return ok(payload);
}
