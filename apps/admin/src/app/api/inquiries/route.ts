import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import { ok } from "@store/shared";

import {
  connectDB,
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
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  await connectDB();
  const { page, limit, skip, search, searchPattern } = readListOptions(request);
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { customerName: { $regex: searchPattern, $options: "i" } },
      { phoneNumber: { $regex: searchPattern, $options: "i" } },
      { subjectProductName: { $regex: searchPattern, $options: "i" } },
      { lastMessagePreview: { $regex: searchPattern, $options: "i" } },
    ];
  }
  if (statusFilter && ALLOWED_STATUSES.has(statusFilter)) {
    filter.status = statusFilter as InquiryStatus;
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
