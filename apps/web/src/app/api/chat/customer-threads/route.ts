/**
 * POST /api/chat/customer-threads
 *
 * Returns the signed-in customer's single support conversation, creating it
 * the first time. A customer only ever has ONE thread — repeat calls reuse
 * the existing one so history stays in a single place. The first message is
 * sent via POST .../messages.
 */

import { Types } from "mongoose";

import { Customer, Inquiry as InquiryModel, connectDB } from "@store/db";
import {
  badRequest,
  created,
  logger,
  resolveChatWelcomeMessage,
  serverError,
} from "@store/shared";

import { enforceSameOrigin } from "@/lib/api/sameOrigin";
import { auth } from "@/lib/auth";
import { getChatSettings } from "@/lib/chat/chatSettings";
import { toThread } from "@/lib/chat/serializer";
import type { InquiryLean } from "@/lib/chat/serializer";

export async function POST(request: Request) {
  const csrf = enforceSameOrigin(request);
  if (csrf) {
    return csrf;
  }

  const settings = await getChatSettings();
  if (!settings.enabled) {
    return badRequest("Chat is currently disabled.");
  }

  const session = await auth();
  if (
    session?.user?.role !== "customer" ||
    !session.user.customerId ||
    !Types.ObjectId.isValid(session.user.customerId)
  ) {
    return badRequest("Sign in to start a conversation.");
  }

  await connectDB();
  const customerId = new Types.ObjectId(session.user.customerId);

  // One conversation per customer: reuse the existing thread if there is one.
  const existing = await InquiryModel.findOne({ customerId })
    .sort({ lastMessageAt: -1 })
    .lean<InquiryLean>();
  if (existing) {
    return created(toThread(existing));
  }

  const customer = await Customer.findById(session.user.customerId)
    .select({ name: 1, phoneNumber: 1 })
    .lean<{ name: string; phoneNumber: string }>();
  if (!customer) {
    return badRequest("Customer account not found.");
  }

  try {
    const now = new Date();
    const welcome = resolveChatWelcomeMessage({
      audience: "customer",
      settings,
      guestMessageLimit: settings.guestMessageLimit,
    });
    const doc = await InquiryModel.create({
      customerName: customer.name,
      phoneNumber: customer.phoneNumber,
      customerId,
      status: "open",
      lastMessageAt: now,
      lastMessagePreview: welcome.slice(0, 280),
      lastMessageAuthor: "assistant",
      unreadByCustomer: 0,
      unreadByTeam: 0,
      messages: [],
    });

    const lean = await InquiryModel.findById(doc._id).lean<InquiryLean>();
    if (!lean) {
      return serverError("Thread vanished after creation.");
    }

    return created(toThread(lean));
  } catch (error) {
    logger.error({ error }, "Failed to start customer chat thread");
    return serverError("Could not open chat. Please try again.");
  }
}
