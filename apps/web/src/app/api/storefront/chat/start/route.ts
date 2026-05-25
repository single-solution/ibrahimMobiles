/**
 * POST /api/storefront/chat/start
 *
 * Opens a new chat thread.
 *
 * Body:
 *   - customerName: required, full name (PLAN §12.5). Regex enforced.
 *   - phoneNumber:  required, canonical anchor.
 *   - body:         required, first message body.
 *   - subjectProductId: optional, ObjectId.
 *   - subjectProductName: optional, denormalised name snapshot.
 *
 * Behaviour:
 *   - Signed-in customers (storefront NextAuth session) attach their
 *     `customerId` automatically.
 *   - Guests get a JWT `inquiry_thread_token` cookie that grants them
 *     read access to this thread for `chat.guestThreadTokenDays`.
 *   - Rate-limited per (IP, phone) — same envelope as the legacy
 *     `/storefront/inquiries` POST.
 */

import { cookies } from "next/headers";
import { Types } from "mongoose";

import { Customer, Inquiry, connectDB, getStoreSettings } from "@store/db";
import {
  appendInquiryToGuestToken,
  badRequest,
  CHAT_MESSAGE_BODY_MAX,
  created,
  FIELD_LIMITS,
  isFieldError,
  isValidId,
  logger,
  parseBody,
  serverError,
  SHORT_BURST_WINDOW_MS,
  validateCustomerName,
  validateMessageBody,
  validateString,
} from "@store/shared";

import { auth } from "@/lib/auth";
import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";
import { getChatSettings } from "@/lib/chat/chatSettings";
import { maybeReplyWithAssistant, reloadInquiry } from "@/lib/chat/assistant/maybeReply";
import { toStorefrontThread } from "@/lib/chat/serializer";
import type { InquiryLean } from "@/lib/chat/serializer";

const MAX_PER_WINDOW = 5;
const COOKIE_NAME = "inquiry_thread_token";

interface StartBody {
  customerName?: unknown;
  phoneNumber?: unknown;
  body?: unknown;
  subjectProductId?: unknown;
  subjectProductName?: unknown;
}

export async function POST(request: Request) {
  const settings = await getChatSettings();
  if (!settings.enabled) {
    return badRequest("Chat is currently disabled.");
  }

  const parsed = await parseBody<StartBody>(request);
  if (parsed instanceof Response) return parsed;

  const phoneResult = validateString(parsed.phoneNumber, {
    label: "Phone",
    min: 7,
    max: FIELD_LIMITS.phoneNumber,
  });
  if (typeof phoneResult !== "string") {
    return badRequest(phoneResult.error);
  }

  const limited = enforcePublicRateLimit(request, {
    scope: "chat-start",
    identifier: phoneResult,
    max: MAX_PER_WINDOW,
    windowMs: SHORT_BURST_WINDOW_MS,
  });
  if (limited) return limited;

  const nameResult = validateCustomerName(parsed.customerName);
  if (isFieldError(nameResult)) {
    return badRequest(nameResult.error);
  }

  const bodyResult = validateMessageBody(parsed.body);
  if (isFieldError(bodyResult)) {
    return badRequest(bodyResult.error);
  }
  if (bodyResult.length > CHAT_MESSAGE_BODY_MAX) {
    return badRequest("Message too long.");
  }

  let subjectProductId: Types.ObjectId | undefined;
  if (parsed.subjectProductId !== undefined && parsed.subjectProductId !== null) {
    if (!isValidId(parsed.subjectProductId)) {
      return badRequest("subjectProductId must be a Mongo ObjectId.");
    }
    subjectProductId = new Types.ObjectId(parsed.subjectProductId);
  }

  let subjectProductName: string | undefined;
  if (typeof parsed.subjectProductName === "string") {
    const t = parsed.subjectProductName.trim();
    if (t) subjectProductName = t.slice(0, 200);
  }

  // Optional signed-in customer.
  let customerId: Types.ObjectId | undefined;
  const session = await auth();
  if (
    session?.user?.role === "customer" &&
    session.user.customerId &&
    Types.ObjectId.isValid(session.user.customerId)
  ) {
    customerId = new Types.ObjectId(session.user.customerId);
  }

  await connectDB();
  try {
    if (!customerId) {
      const existingCustomer = await Customer.findOne({ phoneNumber: phoneResult })
        .select({ _id: 1 })
        .lean<{ _id: Types.ObjectId }>();
      if (existingCustomer?._id) {
        customerId = existingCustomer._id;
      }
    }

    const now = new Date();
    const doc = await Inquiry.create({
      customerName: nameResult,
      phoneNumber: phoneResult,
      customerId,
      subjectProductId,
      subjectProductName,
      status: "open",
      lastMessageAt: now,
      lastMessagePreview: bodyResult.slice(0, 280),
      lastMessageAuthor: "customer",
      unreadByCustomer: 0,
      unreadByTeam: 1,
      messages: [
        {
          author: "customer",
          authorName: nameResult,
          body: bodyResult,
          createdAt: now,
        },
      ],
    });

    const lean = await Inquiry.findById(doc._id).lean<InquiryLean>();
    if (!lean) {
      return serverError("Thread vanished after creation.");
    }

    try {
      await maybeReplyWithAssistant(lean);
    } catch (assistantError) {
      logger.error({ assistantError }, "chat-assistant: welcome reply failed");
    }

    const refreshed = (await reloadInquiry(doc._id)) ?? lean;
    const thread = toStorefrontThread(refreshed);

    // Re-issue guest cookie when there's no session — appends the new
    // inquiry id so the visitor's browser holds the running set of
    // their threads.
    const cookieJar = await cookies();
    if (!customerId) {
      const existing = cookieJar.get(COOKIE_NAME)?.value;
      const reissued = await appendInquiryToGuestToken(
        existing,
        thread.id,
        phoneResult,
        { days: settings.guestThreadTokenDays },
      );
      cookieJar.set({
        name: COOKIE_NAME,
        value: reissued.token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: reissued.maxAgeSeconds,
      });
    }

    void getStoreSettings();

    return created(thread);
  } catch (error) {
    logger.error({ error }, "Failed to start chat thread");
    return serverError("Could not start the chat. Please try again.");
  }
}
