import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import {
  FIELD_LIMITS,
  badRequest,
  created,
  isValidationError,
  isValidId,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import {
  connectDB,
  handleMongoError,
  Inquiry,
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  type InquirySource,
  type InquiryStatus,
} from "@store/db";

import { recordActivity } from "@/lib/services/activityLog";

import { toInquiryResponse, type InquiryLean } from "@/lib/serializers/inquiry";
import type { AdminInquiry } from "@/types/admin";

const ALLOWED_SOURCES = new Set<string>(INQUIRY_SOURCES);
const ALLOWED_STATUSES = new Set<string>(INQUIRY_STATUSES);

interface InquiryInput {
  customerName?: unknown;
  customerCity?: unknown;
  phoneNumber?: unknown;
  modelName?: unknown;
  variantSummary?: unknown;
  expectedRupees?: unknown;
  source?: unknown;
  status?: unknown;
  lastMessage?: unknown;
  notes?: unknown;
  productId?: unknown;
}

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
      { modelName: { $regex: searchPattern, $options: "i" } },
      { customerCity: { $regex: searchPattern, $options: "i" } },
    ];
  }
  if (statusFilter && ALLOWED_STATUSES.has(statusFilter)) {
    filter.status = statusFilter as InquiryStatus;
  }

  const [docs, total] = await Promise.all([
    Inquiry.find(filter).sort({ receivedAt: -1 }).skip(skip).limit(limit).lean<InquiryLean[]>(),
    Inquiry.countDocuments(filter),
  ]);

  const payload: ListResponse<AdminInquiry> = {
    items: docs.map(toInquiryResponse),
    total,
    page,
    limit,
  };
  return ok(payload);
}

export async function POST(request: Request) {
  const { actor, response } = await requireSession("inquiry_manage");
  if (response) {
    return response;
  }

  const body = await parseBody<InquiryInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const customerNameResult = validateString(body.customerName, {
    label: "Customer name",
    max: FIELD_LIMITS.personName,
  });
  if (isValidationError(customerNameResult)) {
    return badRequest(customerNameResult.error);
  }

  const customerCityResult = validateString(body.customerCity, {
    label: "City",
    max: FIELD_LIMITS.city,
  });
  if (isValidationError(customerCityResult)) {
    return badRequest(customerCityResult.error);
  }

  const phoneResult = validateString(body.phoneNumber, {
    label: "Phone number",
    max: FIELD_LIMITS.phoneNumber,
  });
  if (isValidationError(phoneResult)) {
    return badRequest(phoneResult.error);
  }

  const modelResult = validateString(body.modelName, {
    label: "Model name",
    max: FIELD_LIMITS.personName,
  });
  if (isValidationError(modelResult)) {
    return badRequest(modelResult.error);
  }

  const lastMessageResult = validateString(body.lastMessage, {
    label: "Last message",
    max: FIELD_LIMITS.crmNotes,
  });
  if (isValidationError(lastMessageResult)) {
    return badRequest(lastMessageResult.error);
  }

  const source =
    typeof body.source === "string" && ALLOWED_SOURCES.has(body.source)
      ? (body.source as InquirySource)
      : "other";

  await connectDB();
  try {
    const doc = await Inquiry.create({
      customerName: customerNameResult,
      customerCity: customerCityResult,
      phoneNumber: phoneResult,
      modelName: modelResult,
      variantSummary:
        typeof body.variantSummary === "string"
          ? body.variantSummary.trim().slice(0, FIELD_LIMITS.shortText)
          : undefined,
      expectedRupees:
        typeof body.expectedRupees === "number" && body.expectedRupees >= 0
          ? body.expectedRupees
          : undefined,
      source,
      status: "new",
      lastMessage: lastMessageResult,
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, FIELD_LIMITS.messageBody)
          : undefined,
      productId: isValidId(body.productId) ? body.productId : undefined,
      receivedAt: new Date(),
    });
    await recordActivity({
      actor,
      action: "created",
      resourceType: "inquiry",
      resourceId: doc._id.toString(),
      resourceLabel: `${doc.customerName} · ${doc.modelName}`,
    });
    return created(toInquiryResponse(doc.toObject() as InquiryLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
